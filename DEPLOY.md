# Vercel 배포

**이 프로젝트는 WSL에 있으므로 반드시 WSL 터미널에서 배포하세요.**  
PowerShell에서 UNC 경로(`\\wsl$\...`)로 실행하면 `EPERM: scandir 'C:\Windows\CSC\'` 오류가 납니다.

---

## WSL 터미널에서 실행 (권장)

Cursor에서 **터미널** 열고, 오른쪽 **+** 옆 드롭다운에서 **Ubuntu (WSL)** 를 선택한 뒤 아래 실행.

**한 줄:**

```bash
cd /root/.openclaw/workspace/voxel-dog-climber && export VERCEL_TOKEN=gCE1s5XCZVXjeSUWAKV6U1ot && npx vercel --prod --yes
```

**줄마다:**

```bash
cd /root/.openclaw/workspace/voxel-dog-climber
export VERCEL_TOKEN=gCE1s5XCZVXjeSUWAKV6U1ot
npx vercel --prod --yes
```

---

배포가 끝나면 터미널에 **Production URL**이 출력됩니다.

---

**보안:** 배포 후 [Vercel → Account → Tokens](https://vercel.com/account/tokens)에서 이 토큰을 **Revoke** 한 뒤, 필요하면 새 토큰을 만들어 쓰세요.
