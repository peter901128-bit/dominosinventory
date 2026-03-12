# 도미노 재고 발주 시스템

재고 수량을 입력하면 부족 품목을 분석하고, **peter901128@gmail.com**으로 발주 메일을 자동 발송하는 웹 앱입니다.

- **Vercel** 배포용 (서버 없이 웹에서 바로 사용)
- **팀 비밀번호**로 접근 제한
- 메일 발송은 Vercel 서버리스 API에서 처리 (Gmail SMTP)

---

## 배포 (Vercel)

1. [Vercel](https://vercel.com)에 로그인 후 **Import** → 이 GitHub 저장소 선택
2. **Environment Variables**에 다음 변수 추가:
   - `TEAM_PASSWORD`: 팀원에게 공유할 비밀번호 (로그인용)
   - `GMAIL_APP_PASSWORD`: Gmail 앱 비밀번호 (peter901128@gmail.com 계정, [앱 비밀번호 생성](https://myaccount.google.com/apppasswords))
3. **Deploy** 후 배포 URL로 접속
4. 팀 비밀번호 입력 후 사용

---

## 로컬 테스트

```bash
npm install
npx vercel dev
```

브라우저에서 `http://localhost:3000` 접속. 로컬에서는 `.env` 또는 `.env.local`에 `TEAM_PASSWORD`, `GMAIL_APP_PASSWORD` 설정.

---

## 저장소

- GitHub: https://github.com/peter901128-bit/dominosinventory
