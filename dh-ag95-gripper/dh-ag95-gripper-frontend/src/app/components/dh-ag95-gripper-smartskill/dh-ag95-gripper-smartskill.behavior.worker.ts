import {
    registerSmartSkillBehavior,
    ScriptBuilder,
    SmartSkillBehaviors,
    SmartSkillInstance,
    SmartSkillsBehaviorAPI,
    SmartSkillsData,
} from '@universal-robots/contribution-api';
import { generatePreambleScriptCode } from '../dh-ag95-gripper-app/dh-ag95-gripper-app.behavior.worker';

const behaviors: SmartSkillBehaviors = {
    // factory is required
    factory: () => {
        return {
            type: 'dh-ag95-gripper-smartskill',
            name: 'DH AG-95 Gripper Toggle',
            parameters: {},
        };
    },

    // startExecution is required
    startExecution: (instance) => {
        const builder = new ScriptBuilder();
        builder.addStatements(`
#### DH AG95 Gripper Preamble #######################
set_tool_voltage(24)
set_tool_communication(True, 115200, 0, 1, 1.5, 3.5)
dh_ag95 = rpc_factory("xmlrpc", "http://servicegateway/foundry-robotics/dh-ag95-gripper/dh-ag95-gripper-backend/xmlrpc/")

def dh_ag95_connect():
	return dh_ag95.dh_ag95_connect()
end

def dh_ag95_init(full = False):
	return dh_ag95.dh_ag95_init(full)
end

def dh_ag95_is_init():
    return dh_ag95.dh_ag95_is_init()
end

def dh_ag95_set_io_control(iocontrol = False):
	return dh_ag95.dh_ag95_set_io_control(iocontrol)
end

def dh_ag95_set_init_grip_open(open = True):
	return dh_ag95.dh_ag95_set_init_grip_open(open)
end

# valid force interval = 20-100
# min force 20 corresponds to ~45N
# max force 100 corresponds to ~160N
def dh_ag95_set_force(force = 20):
	return dh_ag95.dh_ag95_set_force(force)
end

# valid position interval = 0-1000
# min position corresponds to gripper closed
# max position corresponds to a stroke of ~95mm
# note: does NOT wait until the jaws have moved
def dh_ag95_set_position(position):
	return dh_ag95.dh_ag95_set_position(position)
end

def dh_ag95_get_actual_position():
	return dh_ag95.dh_ag95_get_actual_position()
end

# 0 = fingers are in motion,
# 1 = fingers reached reference position, no object detected or object
#     dropped
# 2 = fingers stopped due to object being gripped
# 3 = fingers at reference position, object has been dropped after
#     having been previously gripped
def dh_ag95_get_grip_status():
	return dh_ag95.dh_ag95_get_grip_status()
end

############################################

def dh_ag95_init_wait(full = False):
    if dh_ag95_init(full) == False:
        return False
    end
	sleep(0.1)
    local wait_counter = 80
	while (dh_ag95_is_init() == False):
        wait_counter = wait_counter - 1
        if wait_counter == 0:
            return False
        end
        sleep(0.1)
	end
    return True
end

def dh_ag95_auto_init():
    if dh_ag95_is_init() == False:
        return dh_ag95_init_wait()
    end
    return True
end

def dh_ag95_open(force = 100, position = 1000, wait = True):
    if dh_ag95_auto_init() == False:
        return False
    end
    if dh_ag95_set_force(force) == False:
        return False
    end
    if dh_ag95_set_position(position) == False:
        return False
    end
    if wait == True:
        return dh_ag95_wait_grip()
    end
    return True
end

def dh_ag95_close(force = 20, position = 0, wait = True):
    if dh_ag95_auto_init() == False:
        return False
    end
    if dh_ag95_set_force(force) == False:
        return False
    end
    if dh_ag95_set_position(position) == False:
        return False
    end
    if wait == True:
        return dh_ag95_wait_grip()
    end
    return True
end

def dh_ag95_wait_grip():
    sleep(0.1)
    local wait_counter = 50
    while (dh_ag95_get_grip_status() == 0):
        wait_counter = wait_counter - 1
        if wait_counter == 0:
            return False
        end
        sleep(0.1)
    end
    return True
end
#####################################################
sleep(0.5)
dh_ag95_auto_init()
if dh_ag95_get_actual_position() != 1000:
    dh_ag95_open(100, 1000, True)
else:
    dh_ag95_close(20, 0, True)
end
#####################################################
`);
        return builder;
    },

    // stopExecution is optional
    // stopExecution: (instance) => {
    //     return new ScriptBuilder();
    // },
};

registerSmartSkillBehavior(behaviors);
