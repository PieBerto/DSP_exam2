## Mosquitto Configuration

This folder must contain the Eclipse Mosquitto configuration file (i.e., the mosquitto.conf file).

## Mosquitto information

version: mosquitto version 1.6.9

command to start mosquitto: (windows)
- mosquitto -v -c mosquitto.conf

commands in case the error: 'port already in use' during the launch occurs: (windows)
- mosquitto -v -c mosquitto.conf
- netstat -nao -p TCP
- taskkill /F /PID <PID>
  
command to start mosquitto on linux machines:
- mosquitto -v -c mosquittoLinux.conf
