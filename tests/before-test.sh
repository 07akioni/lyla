cd ./server
go run main.go > /dev/null 2>&1 &
echo $! > SERVER_PID
go run main.go cors > /dev/null 2>&1 &
echo $! > CORS_SERVER_PID
sleep 3
