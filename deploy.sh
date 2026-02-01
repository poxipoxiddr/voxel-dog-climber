#!/bin/bash
cd /root/.openclaw/workspace/voxel-dog-climber
npx vercel --prod --yes 2>&1 | tee deploy-log.txt
