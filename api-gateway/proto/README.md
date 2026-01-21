# gRPC Protocol Buffers Definitions

This directory contains shared gRPC `.proto` files for service-to-service communication.

## Structure

```
proto/
├── events.proto         # Event catalog definitions
├── orders.proto         # Order processing definitions
├── notifications.proto  # Notification definitions
└── common.proto         # Common/shared message types
```

## Usage

### Node.js

```bash
npm install @grpc/grpc-js @grpc/proto-loader
```

### Python

```bash
pip install grpcio grpcio-tools
```

## Generating Code

### Node.js
```bash
# Install tools
npm install -g grpc-tools

# Generate code
grpc_tools_node_protoc \
  --js_out=import_style=commonjs,binary:. \
  --grpc_out=grpc_js:. \
  --plugin=protoc-gen-grpc=`which grpc_tools_node_protoc_plugin` \
  proto/*.proto
```

### Python
```bash
python -m grpc_tools.protoc \
  -I. \
  --python_out=. \
  --grpc_python_out=. \
  proto/*.proto
```

## Notes

- Keep proto files in sync across all services
- Use semantic versioning for breaking changes
- Document all message types and services
