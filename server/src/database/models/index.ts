// Database models

// User model
export interface User {
  id: string;
  email: string | null;
  name: string | null;
  created_at: string;
  google_id?: string | null;
}

// Poll model
export interface Poll {
  id: string;
  author_id: string;
  created_at: string;
  question: string;
}

// Answer model
export interface Answer {
  id: string;
  poll_id: string;
  text: string;
}

// Vote model
export interface Vote {
  id: string;
  poll_id: string;
  answer_id: string;
  user_id: string;
  created_at: string;
}
