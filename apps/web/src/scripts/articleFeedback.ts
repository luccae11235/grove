type Locale = "en" | "pt-BR";
type Sentiment = "helpful" | "not_helpful";

interface StoredFeedback {
  feedbackId: string;
  sentiment: Sentiment;
  reason?: string;
  comment?: string;
}

export interface ArticleFeedbackConfig {
  root: HTMLElement;
  apiBase: string;
  contentId: string;
  locale: Locale;
}

export function initializeArticleFeedback(config: ArticleFeedbackConfig) {
  const form = config.root.querySelector<HTMLFormElement>("form");
  const details = config.root.querySelector<HTMLElement>("[data-feedback-details]");
  const status = config.root.querySelector<HTMLElement>("[data-feedback-status]");
  const submit = config.root.querySelector<HTMLButtonElement>("[data-feedback-submit]");
  const comment = config.root.querySelector<HTMLTextAreaElement>("[data-feedback-comment]");
  const count = config.root.querySelector<HTMLElement>("[data-feedback-count]");
  if (!form || !details || !status || !submit || !comment || !count) return;

  const storageKey = `aflora-article-feedback:v1:${config.contentId}`;
  let stored = readStored(storageKey);
  let feedbackId = stored?.feedbackId ?? crypto.randomUUID();

  const copy = config.locale === "pt-BR"
    ? {
        saved: "Obrigado — sua resposta foi salva.",
        error: "Não foi possível salvar agora. Sua resposta continua aqui para você tentar novamente.",
        submit: "Enviar resposta",
        update: "Salvar alterações",
        remaining: (value: number) => `${value} caracteres restantes`,
      }
    : {
        saved: "Thank you — your response was saved.",
        error: "We could not save this yet. Your response is still here so you can try again.",
        submit: "Submit feedback",
        update: "Save changes",
        remaining: (value: number) => `${value} characters remaining`,
      };

  const selectedSentiment = () =>
    form.querySelector<HTMLInputElement>('input[name="sentiment"]:checked')?.value as Sentiment | undefined;

  const reveal = () => {
    const selected = selectedSentiment();
    details.hidden = !selected;
    for (const label of form.querySelectorAll<HTMLElement>("[data-feedback-choice]")) {
      const input = label.querySelector<HTMLInputElement>('input[name="sentiment"]');
      label.dataset.selected = String(input?.checked === true);
    }
  };

  const updateCount = () => {
    count.textContent = copy.remaining(500 - comment.value.length);
  };

  if (stored) {
    const sentiment = form.querySelector<HTMLInputElement>(
      `input[name="sentiment"][value="${stored.sentiment}"]`,
    );
    if (sentiment) sentiment.checked = true;
    const reason = form.querySelector<HTMLSelectElement>('[name="reason"]');
    if (reason) reason.value = stored.reason ?? "";
    comment.value = stored.comment ?? "";
    submit.textContent = copy.update;
    status.textContent = copy.saved;
  }
  reveal();
  updateCount();

  form.addEventListener("change", reveal);
  comment.addEventListener("input", updateCount);
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const sentiment = selectedSentiment();
    if (!sentiment) return;
    const reason = new FormData(form).get("reason")?.toString() || undefined;
    const normalizedComment = comment.value.trim() || undefined;
    const payload = {
      feedbackId,
      contentId: config.contentId,
      locale: config.locale,
      path: window.location.pathname,
      sentiment,
      ...(reason ? { reason } : {}),
      ...(normalizedComment ? { comment: normalizedComment } : {}),
    };
    setDisabled(form, true);
    status.textContent = "";
    try {
      const response = await fetch(
        stored ? `${config.apiBase}/v1/feedback/${encodeURIComponent(feedbackId)}` : `${config.apiBase}/v1/feedback`,
        {
          method: stored ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      if (!response.ok) throw new Error(`Feedback returned ${response.status}`);
      stored = { feedbackId, sentiment, reason, comment: normalizedComment };
      writeStored(storageKey, stored);
      submit.textContent = copy.update;
      status.textContent = copy.saved;
    } catch {
      status.textContent = copy.error;
    } finally {
      setDisabled(form, false);
    }
  });
}

function setDisabled(form: HTMLFormElement, disabled: boolean) {
  for (const control of form.elements) {
    if (control instanceof HTMLButtonElement || control instanceof HTMLInputElement ||
      control instanceof HTMLSelectElement || control instanceof HTMLTextAreaElement) {
      control.disabled = disabled;
    }
  }
}

function readStored(key: string): StoredFeedback | undefined {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) ?? "null") as StoredFeedback | null;
    if (!parsed || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(parsed.feedbackId) ||
      !["helpful", "not_helpful"].includes(parsed.sentiment)) return undefined;
    return parsed;
  } catch {
    return undefined;
  }
}

function writeStored(key: string, value: StoredFeedback) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
