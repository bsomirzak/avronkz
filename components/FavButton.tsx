"use client";

export function FavButton() {
  return (
    <button
      type="button"
      className="fav-btn"
      aria-label="В избранное"
      style={{ zIndex: 3 }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <svg viewBox="0 0 24 24" strokeWidth="2">
        <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8z" />
      </svg>
    </button>
  );
}
