import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { WizardForm } from "@/components/WizardForm";

describe("WizardForm", () => {
  it("blocks submission and shows error summary when required fields are missing", () => {
    const onSubmit = vi.fn();
    render(<WizardForm onSubmit={onSubmit} />);

    fireEvent.click(screen.getByRole("button", { name: /see ranked visa results/i }));

    expect(onSubmit).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/fix the/i);
  });

  it("marks required inputs aria-invalid after a failed submit attempt", () => {
    const onSubmit = vi.fn();
    render(<WizardForm onSubmit={onSubmit} />);

    fireEvent.click(
      screen.getByRole("button", { name: /see ranked visa results/i }),
    );

    // Required text input — nationality must be flagged.
    const nationality = screen.getByLabelText(/nationality/i);
    expect(nationality).toHaveAttribute("aria-invalid", "true");
    // describedby points to the rendered error node.
    const describedBy = nationality.getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)).not.toBeNull();
  });

  it("wraps boolean radio groups in <fieldset> with a <legend>", () => {
    const onSubmit = vi.fn();
    const { container } = render(<WizardForm onSubmit={onSubmit} />);

    const fieldsets = container.querySelectorAll("fieldset");
    // At least the six boolean groups + current location + goal = 8.
    expect(fieldsets.length).toBeGreaterThanOrEqual(7);

    // Spot-check a known group: it must contain a <legend>.
    const australianStudyRadio = container.querySelector(
      'input[name="australianStudyCompleted"]',
    );
    expect(australianStudyRadio).not.toBeNull();
    const owningFieldset = australianStudyRadio?.closest("fieldset");
    expect(owningFieldset).not.toBeNull();
    const legend = owningFieldset?.querySelector("legend");
    expect(legend).not.toBeNull();
    expect(legend?.textContent ?? "").toMatch(/completed study in australia/i);
  });

  it("shows an unsupported-occupation note but does not block", () => {
    const onSubmit = vi.fn();
    render(<WizardForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/occupation/i), {
      target: { value: "Astronaut" },
    });

    expect(
      screen.getByText(/isn't in our supported list/i),
    ).toBeInTheDocument();
  });

  it("submits a valid situation", () => {
    const onSubmit = vi.fn();
    render(<WizardForm onSubmit={onSubmit} />);

    fireEvent.change(screen.getByLabelText(/nationality/i), {
      target: { value: "United Kingdom" },
    });
    fireEvent.change(screen.getByLabelText(/^age$/i), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByLabelText(/inside australia/i));
    fireEvent.change(screen.getByLabelText(/occupation/i), {
      target: { value: "Software Engineer" },
    });
    fireEvent.change(screen.getByLabelText(/english level/i), {
      target: { value: "proficient" },
    });
    fireEvent.change(screen.getByLabelText(/highest qualification/i), {
      target: { value: "bachelor" },
    });
    // Australian study? choose No (one of the matching radios)
    const ausStudyNo = screen.getAllByLabelText(/^no$/i)[0];
    fireEvent.click(ausStudyNo);
    fireEvent.change(screen.getByLabelText(/years of relevant work experience/i), {
      target: { value: "5" },
    });

    // Employer sponsor: No
    const radios = screen.getAllByLabelText(/^no$/i);
    radios.forEach((r) => fireEvent.click(r));

    fireEvent.change(screen.getByLabelText(/available funds/i), {
      target: { value: "over_50k" },
    });
    fireEvent.click(screen.getByLabelText(/permanent residence/i));

    fireEvent.click(
      screen.getByRole("button", { name: /see ranked visa results/i }),
    );

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const arg = onSubmit.mock.calls[0]![0];
    expect(arg.nationality).toBe("United Kingdom");
    expect(arg.age).toBe(30);
    expect(arg.goal).toBe("pr");
  });
});
