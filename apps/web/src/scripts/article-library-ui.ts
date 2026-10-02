const library = document.querySelector<HTMLElement>("[data-article-library]");

if (library) {
  const buttons = Array.from(library.querySelectorAll<HTMLButtonElement>("[data-topic-button]"));
  const panels = Array.from(library.querySelectorAll<HTMLElement>("[data-topic-panel]"));
  const topics = new Set(buttons.map((button) => button.dataset.topicButton));

  const selectTopic = (topic: string) => {
    if (!topics.has(topic)) return;
    for (const button of buttons) {
      const selected = button.dataset.topicButton === topic;
      button.setAttribute("aria-selected", String(selected));
      button.tabIndex = selected ? 0 : -1;
    }
    for (const panel of panels) {
      panel.hidden = panel.dataset.topicPanel !== topic;
    }
  };

  const selectFromHash = () => {
    const topic = decodeURIComponent(window.location.hash.slice(1)).replace(/^topic-/, "");
    selectTopic(topics.has(topic) ? topic : buttons[0]?.dataset.topicButton ?? "");
  };

  for (const button of buttons) {
    button.addEventListener("click", () => {
      const topic = button.dataset.topicButton;
      if (!topic) return;
      selectTopic(topic);
      history.pushState(null, "", `#topic-${topic}`);
    });
    button.addEventListener("keydown", (event) => {
      const index = buttons.indexOf(button);
      const nextIndex = event.key === "ArrowDown" || event.key === "ArrowRight"
        ? (index + 1) % buttons.length
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? (index - 1 + buttons.length) % buttons.length
          : event.key === "Home"
            ? 0
            : event.key === "End"
              ? buttons.length - 1
              : -1;
      if (nextIndex < 0) return;
      event.preventDefault();
      buttons[nextIndex]?.focus();
      buttons[nextIndex]?.click();
    });
  }

  window.addEventListener("popstate", selectFromHash);
  window.addEventListener("hashchange", selectFromHash);
  selectFromHash();
}
