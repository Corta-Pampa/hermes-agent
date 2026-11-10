import { describe, expect, it } from "vitest";

import { resolveShell, SHELL_STORAGE_KEY } from "./shell-mode";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value),
    removeItem: (key: string) => void data.delete(key),
  };
}

describe("resolveShell", () => {
  it("mounts the Corta interface by default", () => {
    expect(resolveShell("", memoryStorage())).toEqual({ shell: "corta", cleanedSearch: null });
  });

  it("switches to the advanced dashboard on request and remembers it", () => {
    const storage = memoryStorage();
    expect(resolveShell("?interface=avancee&x=1", storage)).toEqual({
      shell: "advanced",
      cleanedSearch: "?x=1",
    });
    expect(resolveShell("", storage).shell).toBe("advanced");
  });

  it("switches back to the Corta interface and forgets the advanced choice", () => {
    const storage = memoryStorage({ [SHELL_STORAGE_KEY]: "advanced" });
    expect(resolveShell("?interface=simple", storage)).toEqual({ shell: "corta", cleanedSearch: "" });
    expect(storage.data.has(SHELL_STORAGE_KEY)).toBe(false);
  });

  it("ignores an unknown switch value and keeps the remembered interface", () => {
    expect(resolveShell("?interface=nope", memoryStorage()).shell).toBe("corta");
  });

  it("still resolves when storage throws", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
      removeItem: () => {
        throw new Error("blocked");
      },
    };
    expect(resolveShell("", broken).shell).toBe("corta");
    expect(resolveShell("?interface=avancee", broken).shell).toBe("advanced");
  });
});
