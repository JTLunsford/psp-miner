# psp-miner
curl -s https://s3.amazonaws.com/download.draios.com/stable/install-sysdig | sudo bash

git clone https://github.com/JTLunsford/psp-miner
cd ./psp-miner
npm i
chmod +x run
sudo -s
./run 

ERROR: start is missing
Usage:
  run [OPTIONS] [ARGS]
Options: 
  -s, --start            start the capture
  -f, --fd               capture file descriptors
  -p, --proc             capture the child/parent relationships
      --url URL          remote server url to send events for processing 
      --run-for NUMBER   run application for a certain number of seconds 
  -n, --no-sysdig        do not spawn sysdig process
  -c, --test-child       add a test child/parent
  -e, --test-events      add a test child/parent
  -i, --test-internet    test internet connection
  -k, --no-color         Omit color from output
      --debug            Show debug information
  -v, --version          Display the current version
  -h, --help             Display help and usage details
