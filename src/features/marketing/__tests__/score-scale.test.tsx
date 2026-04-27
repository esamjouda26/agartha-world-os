import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { ScoreScale } from "@/features/marketing/components/score-scale";

describe("ScoreScale a11y", () => {
  it("ArrowRight selects the next score", () => {
    const onChange = vi.fn();
    render(
      <ScoreScale
        value={3}
        onChange={onChange}
        lowLabel="Poor"
        highLabel="Excellent"
        data-testid="scale"
      />,
    );
    const group = screen.getByRole("radiogroup");
    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith(4);
  });

  it("ArrowLeft selects the previous score", () => {
    const onChange = vi.fn();
    render(
      <ScoreScale
        value={3}
        onChange={onChange}
        lowLabel="Poor"
        highLabel="Excellent"
        data-testid="scale"
      />,
    );
    const group = screen.getByRole("radiogroup");
    fireEvent.keyDown(group, { key: "ArrowLeft" });
    expect(onChange).toHaveBeenCalledWith(2);
  });

  it("End jumps to 10", () => {
    const onChange = vi.fn();
    render(
      <ScoreScale
        value={3}
        onChange={onChange}
        lowLabel="Poor"
        highLabel="Excellent"
        data-testid="scale"
      />,
    );
    const group = screen.getByRole("radiogroup");
    fireEvent.keyDown(group, { key: "End" });
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it("Home jumps to 0", () => {
    const onChange = vi.fn();
    render(
      <ScoreScale
        value={5}
        onChange={onChange}
        lowLabel="Poor"
        highLabel="Excellent"
        data-testid="scale"
      />,
    );
    const group = screen.getByRole("radiogroup");
    fireEvent.keyDown(group, { key: "Home" });
    expect(onChange).toHaveBeenCalledWith(0);
  });

  it("ArrowRight at 10 clamps (no overflow)", () => {
    const onChange = vi.fn();
    render(
      <ScoreScale
        value={10}
        onChange={onChange}
        lowLabel="Poor"
        highLabel="Excellent"
        data-testid="scale"
      />,
    );
    const group = screen.getByRole("radiogroup");
    fireEvent.keyDown(group, { key: "ArrowRight" });
    expect(onChange).toHaveBeenCalledWith(10);
  });

  it("renders 11 radio buttons with correct aria-checked", () => {
    render(<ScoreScale value={7} onChange={() => {}} lowLabel="Poor" highLabel="Excellent" />);
    const radios = screen.getAllByRole("radio");
    expect(radios).toHaveLength(11);
    const selected = radios[7]!;
    expect(selected).toHaveAttribute("aria-checked", "true");
    // Roving tabindex: only the selected button is in tab order.
    expect(selected).toHaveAttribute("tabindex", "0");
    expect(radios[0]!).toHaveAttribute("tabindex", "-1");
  });
});
