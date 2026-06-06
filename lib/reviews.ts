// Customer review screenshots, served from public/feedbacks.
// Single source of truth for both the homepage marquee and the /reviews page.
export const REVIEW_IMAGES = Array.from(
  { length: 19 },
  (_, i) => `/feedbacks/feedback-${i + 1}.png`,
);
