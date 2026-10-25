# CampusFix Mobile

Flutter mobile client for the **CampusFix Campus Issue Portal**. Students report
campus problems; administrators track them, update their status and remove
them. It uses the same Express + Supabase PostgreSQL backend as the website.

## Architecture

```
Flutter app  --HTTPS/JSON-->  Express API (Render)  -->  Supabase PostgreSQL
 (this repo)                  /api/auth, /api/issues      issues, mobile_users
```

| Folder | Purpose |
|---|---|
| `lib/config.dart` | API base URL (overridable with `--dart-define`) |
| `lib/theme.dart` | Colours / input style copied from the website CSS |
| `lib/models/` | `Issue`, `AuthSession` |
| `lib/services/api_service.dart` | All HTTP calls, bearer token, error handling |
| `lib/utils/priority.dart` | Category/location lists + priority formula (same as website) |
| `lib/screens/` | Login, issue list, report form, issue detail |
| `lib/widgets/cf_widgets.dart` | Shared cards, pills, dropdown |

## CRUD mapping

| Operation | Screen / widget | Endpoint | Who |
|---|---|---|---|
| **Create** | `ReportIssueScreen` - `Form`, `TextFormField`, dropdowns | `POST /api/issues` | Student |
| **Read** | `IssuesScreen` - `ListView.builder`, search + filters; `IssueDetailScreen` | `GET /api/issues` | Everyone |
| **Update** | `IssueDetailScreen` - `DropdownButton` + Save | `PATCH /api/issues/:issueId/status` | Admin |
| **Delete** | `IssueDetailScreen` - confirm dialog | `DELETE /api/issues/:issueId` | Admin only |
| Login | `LoginScreen` | `POST /api/auth/login` (JWT) | Everyone |

Flutter widgets used: `Form`, `TextFormField` (with validators), `DropdownButton`
(wrapped by `CfDropdown`), `ListView.builder`, `SegmentedButton`, `AlertDialog`,
`RefreshIndicator`, `FilterChip`, `FloatingActionButton.extended`.

## Security notes

* Passwords are never stored or hard-coded; the JWT is kept **in memory only**.
* Students see no delete/status controls, `ApiService.deleteIssue` refuses
  non-admin sessions, **and** the backend must enforce it (see the backend patch).
* Only the public API URL is in the source.

## Run

```bash
flutter pub get
flutter analyze
flutter test

flutter run                                   # uses the deployed backend
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:5000/api   # Android emulator -> local backend
flutter build apk --release
```

Render's free tier sleeps: open
`https://campusfix-backend-z08g.onrender.com/api/health/db` once before a demo.
The first request can take up to a minute; the app shows a message while waiting.
