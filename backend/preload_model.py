"""Preload the local MiniLM model cache during deployment builds."""

from sentence_transformers import SentenceTransformer


def main() -> None:
    SentenceTransformer("all-MiniLM-L6-v2")


if __name__ == "__main__":
    main()
