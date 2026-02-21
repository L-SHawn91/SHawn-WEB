# Telegram → Web 인증 콜백 템플릿

## 목적
Telegram 승인 후 웹으로 돌아올 때 `shawn_token`을 URL로 전달해 자동 로그인합니다.

## 콜백 URL 형식

```text
https://<your-web-domain>/?shawn_token=<URL_ENCODED_JWT>
```

- `JWT`는 반드시 URL 인코딩해서 넣어야 합니다.
- 웹 클라이언트는 `?shawn_token=`를 감지하면 `/api/auth/telegram`으로 자동 검증 요청을 보냅니다.

## 서버에서 템플릿 가져오기

```http
GET /api/auth/callback-template
```

응답 예시:

```json
{
  "origin": "https://shawnlab.example.com",
  "callbackTemplate": "https://shawnlab.example.com/?shawn_token={JWT_TOKEN}",
  "telegramMessageTemplate": "..."
}
```

## Telegram 봇 메시지 예시

```text
✅ 인증이 승인되었습니다.
아래 링크를 눌러 웹 로그인 완료:
https://shawnlab.example.com/?shawn_token=<URL_ENCODED_JWT>
```

## 권장
- JWT 만료 시간을 짧게(예: 5~10분)
- 1회 사용 토큰 정책 적용
- 인증 이벤트는 `logs/auth-events.jsonl`로 감사 추적
