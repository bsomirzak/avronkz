// Customer review screenshots, served from public/feedbacks.
// Single source of truth for both the homepage marquee and the /reviews page.
// Interactive panel reviews come first, then the older screenshots.
const PANEL_REVIEW_IMAGES = Array.from(
  { length: 7 },
  (_, i) => `/feedbacks/panel-${i + 1}.png`,
);

const OTHER_REVIEW_IMAGES = Array.from(
  { length: 19 },
  (_, i) => `/feedbacks/feedback-${i + 1}.png`,
);

export const REVIEW_IMAGES = [...PANEL_REVIEW_IMAGES, ...OTHER_REVIEW_IMAGES];
