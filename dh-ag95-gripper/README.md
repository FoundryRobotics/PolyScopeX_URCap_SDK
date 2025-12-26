# XMLRPC Gripper Sample

This project contains a frontend gripper contribution that utilizes an XMLRPC server and modbus communication on the backend.
Refer to the [official documentation](https://docs.universal-robots.com/) for more information.

## Build and Deploy Sample

To build and deploy this sample, use the commands below. A rebuild of the project is required to see any changes made 
to the source code. If you are deploying the URCap to URSim, ensure that you have started the simulator.

### Dependencies

Run this command to install the dependencies of the project.

```shell
npm install
```

### Build

Run this command to build the contribution type.

```shell
npm run build
```

### Installation

Run this command to install the built URCap to the simulator.

```shell
npm run install-urcap
```

Run this command to install the built URCap to the robot.

```shell
npm run install-urcap -- --host <robot_ip_address>
````


## Backend Contribution

This URCap runs a Python script that starts the XMLRPC server on port 40405.

### manifest.yaml 

The code block below shows the declaration of the gripper.

```yaml
containers:
  - id: dh-ag95-gripper-backend
    image: dh-ag95-gripper-backend:latest
    ingress:
      - id: xmlrpc
        containerPort: 40405
        protocol: http
        proxyUrl: /
    devices:
      - type: ttyTool
```

### Dockerfile 

The Dockerfile runs the `dh-ag95-gripper.py` script. The script starts the server with these lines of code.

```
server = MultithreadedSimpleXMLRPCServer(("0.0.0.0", XMLRPC_PORT), requestHandler=RequestHandler)
server.RequestHandlerClass.protocol_version = "HTTP/1.1"
server.register_function(grip, "grip")
server.register_function(release, "release")
server.register_function(is_busy, "is_busy")
server.register_function(is_grip_detected, "is_grip_detected")
server.serve_forever()
```

### Backend Output

Having built and installed the URCap in the simulator you can open your terminal to see the output from the backend:

```shell
docker exec -it ursim-polyscopex-runtime-1 bash
```

You can find more documentation on the `docker exec` functionality [here](https://docs.docker.com/reference/cli/docker/container/exec/).

Your terminal prompt should have switched from `psxdev@<vsc_container_id>:/pwd/$ ` to `<ursim_container_id>:/pwd/# `, meaning you can now execute commands within your simulator docker container.

List the active docker containers with

```shell
docker ps
```

View the backend output by using the container ID associated with the `universal-robots_dh-ag95-gripper_dh-ag95-gripper-backend` image (e.g. 8e3)

```shell
docker logs -f <container_id>
```

Here is the expected log output when interacting with the program node.

```shell
2024/05/29 08:47:37 [      INFO] Gripper XMLRPC server started on port 40405
2024/05/29 09:22:15 [      INFO] SIMULATOR: Modbus Initialized
2024/05/29 09:22:15 [      INFO] SIMULATOR: Writing data = 50 to address = 3
2024/05/29 09:22:15 [      INFO] SIMULATOR: Writing data = 10 to address = 4
2024/05/29 09:22:15 [      INFO] SIMULATOR: Writing data = 5 to address = 1
2024/05/29 09:23:09 [      INFO] SIMULATOR: Writing data = 50 to address = 3
2024/05/29 09:23:09 [      INFO] SIMULATOR: Writing data = 10 to address = 4
2024/05/29 09:23:09 [      INFO] SIMULATOR: Writing data = 5 to address = 1
2024/05/29 09:23:09 [      INFO] SIMULATOR: Reading register_address 2
```

## Frontend Contribution

The frontend contribution contains an application and program node. The application node simply shows the presenter assets. 
The program node can toggle the gripper state and set conditional functions for grip detection.