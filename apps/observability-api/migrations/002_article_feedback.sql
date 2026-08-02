CREATE TABLE IF NOT EXISTS article_feedback (
  feedback_id uuid PRIMARY KEY,
  content_id text NOT NULL,
  locale text NOT NULL CHECK (locale IN ('en', 'pt-BR')),
  path text NOT NULL,
  sentiment text NOT NULL CHECK (sentiment IN ('helpful', 'not_helpful')),
  reason text CHECK (reason IS NULL OR reason IN (
    'clear', 'useful_example', 'too_difficult', 'too_basic',
    'confusing', 'missing_example'
  )),
  comment text CHECK (comment IS NULL OR char_length(comment) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS article_feedback_content_idx
  ON article_feedback (content_id, created_at);

CREATE INDEX IF NOT EXISTS article_feedback_sentiment_idx
  ON article_feedback (created_at, sentiment);

CREATE INDEX IF NOT EXISTS article_feedback_comment_idx
  ON article_feedback (updated_at) WHERE comment IS NOT NULL;

CREATE OR REPLACE VIEW observability_article_feedback AS
SELECT
  date_trunc('day', created_at)::date AS day,
  content_id,
  locale,
  sentiment,
  reason,
  count(*)::bigint AS responses
FROM article_feedback
GROUP BY 1, 2, 3, 4, 5;
