#!/usr/bin/env python

import os
import serial
import minimalmodbus as modbus
import sys
import time

from logger import *
from xmlrpc.server import SimpleXMLRPCServer
from xmlrpc.server import SimpleXMLRPCRequestHandler
from socketserver import ThreadingMixIn
from exceptions import ModbusFailedWrite, ModbusFailedRead


currentdir = os.path.dirname(os.path.realpath(__file__))
parentdir = os.path.dirname(currentdir)
sys.path.append(parentdir)

tty = '/dev/ur-ttylink/ttyTool'
baudrate = 115200
slave_address = 1
stopbits = 1
parity = serial.PARITY_NONE

device = None
instrument = None
log_read_error = True

XMLRPC_PORT = 40405

# ## Typical message format:
#
# <slave> <function> <register> <data> <crc>
#
# where:
#
# <slave> = the slave address of the gripper, one byte (default = 0x01)
# <function> = function to perform, one byte (see table below)
# <register> = the register address, two bytes (hi-lo, see table below)
# <data> = the data to write, two bytes (hi-lo)
# <crc> = crc error check, two bytes (lo-hi)
#
# hi-lo means 16bit with high byte serialised first first, then low
# lo-hi means low byte serialised first
#
# ## Supported function codes
#
# 0x03: read holding register
# 0x04: read multiple registers
# 0x06: write single register
# 0x10: write multiple registers
#
# ## Supported registers
#
# ### Basic control registers
#
# Initialize (0x01 0x00)
# - Write 0x01: initialization (move fingers to min and max position)
# - Write 0xA5: full initialization (find min and max position)
# - Read: Current setting
#
# Gripper force (0x01 0x01)
# - Write 20-100 (%)
# - Read: Current setting
#
# Gripper position (0x01 0x03)
# - Write 0-1000
# - Read: Reference position currently set
#
# Initialization state (0x02 0x00)
# - Read: 0 = not initialized, 1 = initialized
#
# Gripper state (0x02 0x01)
# - Read:
#   0 = fingers are in motion,
#   1 = fingers reached reference position, no object detected or object
#       dropped
#   2 = fingers stopped due to object being gripped
#   3 = fingers at reference position, object has been dropped after
#       having been previously gripped
#
# Actual gripper position (0x02 0x02)
# - Read: Current gripper actual position
#
# ### Configuration registers
#
# Save parameters (0x03 0x00)
# - Write: 0 = default, 1 = write parameters to gripper's flash
#   writing takes 1-2 seconds, response sent once completed
# - Read: 0
#
# Initialisation gripper position (0x03 0x01)
# - Write: 0 = open (default), 1 = close
# - Read: Current setting
#
# Slave address (0x03 0x02)
# - Write: 0-255 change gripper modbus address (default = 1)
# - Read: Current setting
#
# Baud rate (0x03 0x03)
# - Write: Configure baud rate
#   0 = 115200 (default)
#   1 = 57600
#   2 = 38400
#   3 = 19200
#   4 = 9600
#   5 = 4800
# - Read: Current setting
#
# Stop bits (0x03 0x04)
# - Write: Configure stop bits
#   0 = 1 stop bit (default)
#   1 = 2 stop bits
# - Read: Current setting
#
# Parity (0x03 0x05)
# - Write: Configure parity
#   0: none parity (default)
#   1: odd parity
#   2: even parity
#
# IO parameter test (0x04 0x00)
# - Write: 1, 2, 3, 4
# - Read: Current setting
#
# IO mode switch (0x04 0x02)
# - Write
#   0 = off (control only over modbus rtu)
#   1 = on (control over IO as priority, fallback to modbus rtu)
# - Read: Current setting
#
# IO parameter config (0x04 0x05-0x0F)
# Four groups of IO parameters
# 0x05 position 1 (0-1000)
# 0x06 force 1 (20-100)
# ...
# 0x0E position 4 (0-1000)
# 0x0F force 4 (20-100)
# - Write: Set
# - Read: Current setting

class Regs:
    Initialize = 0x0100
    GripperForce = 0x0101
    GripperPosition = 0x0103

    InitState = 0x0200
    GripState = 0x0201
    ActualGripperPosition = 0x0202

    InitGripperPosition = 0x0301

    IOModeSwitch = 0x0402


class Vals:
    Initialize = 0x01
    InitializeFull = 0xA5

    GripperForceMin = 20
    GripperForceMax = 100

    GripperPositionMin = 0
    GripperPositionMax = 1000

    InitStateNotReady = 0
    InitStateReady = 1

    GripStateInMotion = 0
    GripStateArrived = 1
    GripStateCaught = 2
    GripStateDropped = 3

    InitGripperOpen = 0
    InitGripperClosed = 1

    IOModeModbus = 0
    IOModeIOModbus = 1


def dh_ag95_connect() -> bool:
    global instrument, device
    try:
        device = serial.Serial(
            port=tty,
            baudrate=baudrate,
            parity=parity,
            bytesize=8,
            stopbits=stopbits,
            timeout=0.05,
            write_timeout=0.5,
        )
        instrument = modbus.Instrument(device, slave_address)

        # Firmware may have a bug where first transmission is lost
        # so, perform a dummy first transmission
        tool_modbus_write(Regs.IOModeSwitch, Vals.IOModeModbus)

        time.sleep(0.1)

        return True
    except Exception:
        instrument = None
        return False

def tool_modbus_write(register_address, data):
    global instrument
    try:
        check_initialized()
        instrument.write_register(register_address, int(data), functioncode=0x06)
    except Exception as e:
        instrument = None
        Logger.error("Error in modbus write method", exc_info=True)
        raise ModbusFailedWrite("Error in modbus write method") from e


def tool_modbus_read(register_address):
    global log_read_error
    global instrument
    try:
        check_initialized()
        return int(instrument.read_register(register_address))
    except Exception as e:
        instrument = None
        if log_read_error:
            Logger.error("Error in modbus read method", exc_info=True)
        log_read_error = False
        raise ModbusFailedRead("Modbus failed reading") from e


def check_initialized():
    if instrument is None:
        dh_ag95_connect()


def dh_ag95_init(full: bool) -> bool:
    try:
        if full:
            tool_modbus_write(Regs.Initialize, Vals.InitializeFull)
        else:
            tool_modbus_write(Regs.Initialize, Vals.Initialize)
        return True
    except Exception:
        return False

def dh_ag95_is_init() -> bool:
    try:
        return tool_modbus_read(Regs.InitState) == Vals.InitStateReady
    except Exception:
        return False

def dh_ag95_set_io_control(iocontrol: bool) -> bool:
    try:
        if iocontrol:
            tool_modbus_write(Regs.IOModeSwitch, Vals.IOModeIOModbus)
        else:
            tool_modbus_write(Regs.IOModeSwitch, Vals.IOModeModbus)
        return True
    except Exception:
        return False

def dh_ag95_set_init_grip_open(open: bool) -> bool:
    try:
        if open:
            tool_modbus_write(Regs.InitGripperPosition, Vals.InitGripperOpen)
        else:
            tool_modbus_write(Regs.InitGripperPosition, Vals.InitGripperClosed)
        return True
    except Exception:
        return False

# valid force interval = 20-100
# min force 20 corresponds to ~45N
# max force 100 corresponds to ~160N
def dh_ag95_set_force(force: int) -> None:
    try:
        if force < Vals.GripperForceMin:
            force = Vals.GripperForceMin
        elif force > Vals.GripperForceMax:
            force = Vals.GripperForceMax
        
        tool_modbus_write(Regs.GripperForce, force)
        return True
    except Exception:
        return False

# valid position interval = 0-1000
# min position corresponds to gripper closed
# max position corresponds to a stroke of ~95mm
# note: does NOT wait until the jaws have moved
def dh_ag95_set_position(position: int) -> bool:
    try:
        if position < Vals.GripperPositionMin:
            position = Vals.GripperPositionMin
        elif position > Vals.GripperPositionMax:
            position = Vals.GripperPositionMax
        
        tool_modbus_write(Regs.GripperPosition, position)
        return True
    except Exception:
        return False

def dh_ag95_get_actual_position() -> int:
    try:
        return tool_modbus_read(Regs.ActualGripperPosition)
    except Exception:
        return -1

# 0 = fingers are in motion,
# 1 = fingers reached reference position, no object detected or object
#     dropped
# 2 = fingers stopped due to object being gripped
# 3 = fingers at reference position, object has been dropped after
#     having been previously gripped
def dh_ag95_get_grip_status() -> int:
    try:
        return tool_modbus_read(Regs.GripState)
    except Exception:
        return -1


class RequestHandler(SimpleXMLRPCRequestHandler):
    rpc_paths = ('/',)

    def log_message(self, format, *args):
        pass


class MultithreadedSimpleXMLRPCServer(ThreadingMixIn, SimpleXMLRPCServer):
    pass


server = MultithreadedSimpleXMLRPCServer(("0.0.0.0", XMLRPC_PORT), requestHandler=RequestHandler)
server.RequestHandlerClass.protocol_version = "HTTP/1.1"

server.register_function(dh_ag95_connect, "dh_ag95_connect")
server.register_function(dh_ag95_init, "dh_ag95_init")
server.register_function(dh_ag95_is_init, "dh_ag95_is_init")
server.register_function(dh_ag95_set_io_control, "dh_ag95_set_io_control")
server.register_function(dh_ag95_set_init_grip_open, "dh_ag95_set_init_grip_open")
server.register_function(dh_ag95_set_force, "dh_ag95_set_force")
server.register_function(dh_ag95_set_position, "dh_ag95_set_position")
server.register_function(dh_ag95_get_actual_position, "dh_ag95_get_actual_position")
server.register_function(dh_ag95_get_grip_status, "dh_ag95_get_grip_status")

Logger.info(f'Gripper XMLRPC server started on port {XMLRPC_PORT}')
server.serve_forever()
