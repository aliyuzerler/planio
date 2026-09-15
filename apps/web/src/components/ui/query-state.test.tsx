import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { QueryState } from "./query-state";

describe("QueryState", () => {
  it("shows loading, error, empty and success states", () => {
    const { rerender } = render(
      <QueryState
        isLoading
        isError={false}
        loading="Yükleniyor…"
        error="Hata"
      >
        <p>İçerik</p>
      </QueryState>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Yükleniyor…");

    rerender(
      <QueryState
        isLoading={false}
        isError
        loading="Yükleniyor…"
        error="Hata"
      >
        <p>İçerik</p>
      </QueryState>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Hata");

    rerender(
      <QueryState
        isLoading={false}
        isError={false}
        isEmpty
        loading="Yükleniyor…"
        error="Hata"
        empty="Kayıt yok"
      >
        <p>İçerik</p>
      </QueryState>,
    );
    expect(screen.getByRole("status")).toHaveTextContent("Kayıt yok");

    rerender(
      <QueryState
        isLoading={false}
        isError={false}
        isEmpty={false}
        loading="Yükleniyor…"
        error="Hata"
        empty="Kayıt yok"
      >
        <p>İçerik</p>
      </QueryState>,
    );
    expect(screen.getByText("İçerik")).toBeVisible();
  });
});
