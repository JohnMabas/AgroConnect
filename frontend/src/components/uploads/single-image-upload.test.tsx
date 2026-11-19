import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SingleImageUpload } from "@/components/uploads/single-image-upload";

const UPLOADED_URL =
  "https://res.cloudinary.com/demo/image/upload/v1/agroconnect/profiles/avatar.jpg";

beforeEach(() => {
  Object.defineProperty(URL, "createObjectURL", {
    value: vi.fn(() => "blob:preview"),
    configurable: true,
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    value: vi.fn(),
    configurable: true,
  });
});

function pngFile(): File {
  return new File(["image-bytes"], "photo.png", { type: "image/png" });
}

function fileInput(container: HTMLElement): HTMLInputElement {
  const input = container.querySelector('input[type="file"]');
  if (!input) throw new Error("file input not found");
  return input as HTMLInputElement;
}

describe("SingleImageUpload", () => {
  it("shows the empty state and accepted file hint", () => {
    const { container } = render(
      <SingleImageUpload value={null} onChange={() => {}} upload={vi.fn()} />,
    );

    expect(screen.getByText("No image uploaded")).toBeTruthy();
    expect(
      screen.getByText(/large photos are compressed before upload/),
    ).toBeTruthy();
    expect(fileInput(container).accept).toBe(
      "image/jpeg,image/png,image/webp",
    );
  });

  it("previews the file, reports progress and returns the uploaded URL", async () => {
    let reportProgress: (percent: number) => void = () => {};
    let finishUpload: (() => void) | undefined;
    const upload = vi.fn(
      (_file: File, onProgress: (percent: number) => void) => {
        reportProgress = onProgress;
        return new Promise<string>((resolve) => {
          finishUpload = () => resolve(UPLOADED_URL);
        });
      },
    );
    const onChange = vi.fn();

    const { container } = render(
      <SingleImageUpload value={null} onChange={onChange} upload={upload} />,
    );
    fireEvent.change(fileInput(container), { target: { files: [pngFile()] } });

    await waitFor(() => expect(upload).toHaveBeenCalledTimes(1));
    const preview = screen.getByRole("img", { name: "Image preview" });
    expect(preview.style.backgroundImage).toContain("blob:preview");

    act(() => reportProgress(50));
    expect(screen.getByText("Uploading… 50%")).toBeTruthy();

    await act(async () => finishUpload?.());
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(UPLOADED_URL));
    expect(screen.queryByText(/Uploading/)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("uses a Cloudinary thumbnail transform for the saved value", () => {
    render(
      <SingleImageUpload
        value={UPLOADED_URL}
        onChange={() => {}}
        upload={vi.fn()}
      />,
    );

    const preview = screen.getByRole("img", { name: "Image preview" });
    expect(preview.style.backgroundImage).toContain("w_320");
    expect(preview.style.backgroundImage).toContain("f_auto,q_auto");
  });

  it("rejects files larger than 25 MB before uploading", () => {
    const upload = vi.fn();
    const { container } = render(
      <SingleImageUpload value={null} onChange={() => {}} upload={upload} />,
    );
    const bigFile = new File([new Uint8Array(25 * 1024 * 1024 + 1)], "big.png", {
      type: "image/png",
    });

    fireEvent.change(fileInput(container), { target: { files: [bigFile] } });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Image must be 25 MB or smaller.",
    );
    expect(upload).not.toHaveBeenCalled();
  });

  it("shows a clear error when the backend rejects the image", async () => {
    const upload = vi.fn().mockRejectedValue(new Error("Image is too large. Maximum size is 5 MB."));
    const onChange = vi.fn();
    const { container } = render(
      <SingleImageUpload value={null} onChange={onChange} upload={upload} />,
    );

    fireEvent.change(fileInput(container), { target: { files: [pngFile()] } });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Image is too large. Maximum size is 5 MB.",
    );
    expect(onChange).not.toHaveBeenCalled();
    expect(screen.queryByRole("img", { name: "Image preview" })).toBeNull();
  });

  it("shows a retry button and reuses the file after a failed upload", async () => {
    const upload = vi
      .fn()
      .mockRejectedValueOnce(new Error("Upload timed out. Please retry."))
      .mockResolvedValueOnce(UPLOADED_URL);
    const onChange = vi.fn();
    const { container } = render(
      <SingleImageUpload value={null} onChange={onChange} upload={upload} />,
    );

    fireEvent.change(fileInput(container), { target: { files: [pngFile()] } });

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Upload timed out. Please retry.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Retry upload" }));

    await waitFor(() => expect(onChange).toHaveBeenCalledWith(UPLOADED_URL));
    expect(upload).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("rejects unsupported file types before uploading", () => {
    const upload = vi.fn();
    const { container } = render(
      <SingleImageUpload value={null} onChange={() => {}} upload={upload} />,
    );

    fireEvent.change(fileInput(container), {
      target: { files: [new File(["gif"], "photo.gif", { type: "image/gif" })] },
    });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Upload a JPEG, PNG or WebP image.",
    );
    expect(upload).not.toHaveBeenCalled();
  });

  it("removes the current image through the supplied callback", async () => {
    const remove = vi.fn().mockResolvedValue(undefined);
    const onChange = vi.fn();

    function ControlledUpload() {
      const [value, setValue] = useState<string | null>(
        "/uploads/profiles/old.jpg",
      );
      return (
        <SingleImageUpload
          value={value}
          onChange={(next) => {
            onChange(next);
            setValue(next);
          }}
          upload={vi.fn()}
          remove={remove}
        />
      );
    }

    render(<ControlledUpload />);

    fireEvent.click(screen.getByRole("button", { name: "Remove image" }));

    await waitFor(() => expect(remove).toHaveBeenCalledTimes(1));
    expect(onChange).toHaveBeenCalledWith(null);
    expect(screen.getByText("No image uploaded")).toBeTruthy();
  });
});
