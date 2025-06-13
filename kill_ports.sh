#!/bin/bash

# Ports to check and kill
PORTS=(3000 5000)

for PORT in "${PORTS[@]}"; do
  echo "Checking for processes on port $PORT..."
  PID=$(sudo lsof -t -i:$PORT)
  if [ -n "$PID" ]; then
    echo "Terminating process $PID on port $PORT..."
    sudo kill -9 $PID
    echo "Process on port $PORT terminated."
  else
    echo "No process found on port $PORT."
  fi
done

echo "Port cleanup complete."


#./kill_ports.sh