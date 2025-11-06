### Running on macOS
1. Follow the instructions listed [here](https://github.com/gravitational/teleport/blob/v18.3.0/BUILD_macos.md) , except for the following 
```
1. Use rustc to install 1.83.0 ( in the current dir, make sure you are overriding the current dir) 
```
2. `make full` to generate the teleport binaries.

3. Setup certs and create config file
- Install Install mkcert so you can set up a local certificate authority and create a certificate for running the Teleport Web UI with HTTPS.

```
brew install mkcert
mkcert -install
mkdir teleport-tls
cd teleport-tls
mkcert localhost
cp "$(mkcert -CAROOT)/rootCA.pem" .
cd ..
```

- Run the following commands
```

./build/teleport configure \
  --output="$PWD/tp-config.yaml" \
  --cluster-name=localhost \
  --public-addr=localhost:3080 \
  --cert-file="$PWD/teleport-tls/localhost.pem" \
  --key-file="$PWD/teleport-tls/localhost-key.pem" \
  --data-dir=/tmp/teleport-data
 ```
- Add following to the generated `tp-config.yaml` at the end.
```
db_service:
  enabled: true
  # Auto-attaches to Database resources whose labels match.
  resources:
    - labels:
        "*": "*"
```
   
4.  Run the following command to start the server, and once it startup the app is accesible at localhost:3080, see next command for instrucitons
```
export TELEPORT_ARGS="start --config=tp-config.yaml"
make teleport-hot-reload
```

6.    Create user and it gives invite URL, and signup. You need authenticator app.
```
export TELEPORT_CONFIG_FILE="$(pwd)/tp-config.yaml"
./build/tctl users add teleport-admin --roles=editor,access --logins=root,ubuntu,ec2-user
``` 
7. Now, create a DB kind YAML config file. And add it using `./build/tctl create -f ` and use tsh to login. ( you can use ChatGPT for these commands). You need to configure postgres with certificates, as it only support either IAM or certificates.


Now, In the milestone # 1, we will no longer use Certificates. So, Uninstall the postgres, you need to revert the changes to Postgres, and make it work with password. 
