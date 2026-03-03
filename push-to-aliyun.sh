#!/bin/bash

NAMESPACE="unripora"
REGISTRY="crpi-bpk9dy6331fn5ymt.cn-hangzhou.personal.cr.aliyuncs.com"

echo "Tagging backend image..."
docker tag qc-booklog-backend:latest $REGISTRY/$NAMESPACE/qc-booklog-backend:latest

echo "Tagging frontend image..."
docker tag qc-booklog-frontend:latest $REGISTRY/$NAMESPACE/qc-booklog-frontend:latest

echo "Pushing backend image (this may take a while, 1.29GB)..."
docker push $REGISTRY/$NAMESPACE/qc-booklog-backend:latest

echo "Pushing frontend image..."
docker push $REGISTRY/$NAMESPACE/qc-booklog-frontend:latest

echo "Done!"
