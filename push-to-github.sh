#!/bin/bash
# WSL에서 실행: bash push-to-github.sh
# 푸시 시 Username: GitHub 아이디, Password: Personal Access Token 입력

set -e
cd /root/.openclaw/workspace/voxel-dog-climber

git add -A
git commit -m "Add Vercel deploy docs and scripts" || true
git push -u origin main
echo "푸시 완료."
