# Client Module 3 - AI Question Bank and Analytics

## Pages

- `M3DashboardPage.jsx` - Module 3 landing dashboard.
- `AIQuestionGeneratorPage.jsx` - Generate and save AI questions.
- `QuestionBankPage.jsx` - Search, filter, edit, and manage questions.
- `PendingReviewsPage.jsx` - Review, approve, or reject pending questions.
- `StudentAnalyticsPage.jsx` - Topic, difficulty, and time-based analytics.
- `StudentPerformanceReportPage.jsx` - Detailed printable student report.

## Services

- `services/questionService.js` - Question-bank API calls.
- `services/analyticsService.js` - Analytics and report API calls.
- `services/api.js` - Axios client for Module 3 endpoints.

## Navigation

Module 3 routes are registered in the main client router:

```text
/module3
/module3/generate
/module3/questions
/module3/reviews
/module3/analytics
/module3/reports
```

The frontend uses the Vite `/api` proxy, so local API requests are forwarded to the backend.

## Data Sources

Analytics pages use stored assessment and response data returned by the backend. They do not generate random performance values. Student-facing question data excludes the correct answer and explanation until the answer is submitted.

The assessment summary contract is defined in `server/src/modules/module3/contracts/assessmentSummaryContract.js`.
