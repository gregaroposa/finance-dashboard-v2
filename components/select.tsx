"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { SingleValue } from "react-select";
import CreateableSelect from "react-select/creatable";

type Props = {
  onChange: (value?: string) => void;
  onCreate?: (value: string) => void;
  options?: { label: string; value: string }[];
  value?: string | null | undefined;
  disabled?: boolean;
  placeholder?: string;
};

export const Select = ({
  value,
  onChange,
  disabled,
  onCreate,
  options = [],
  placeholder,
}: Props) => {
  const { resolvedTheme } = useTheme();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [portalTarget, setPortalTarget] = useState<HTMLElement | undefined>();

  // Ensure the menu portal mounts inside the nearest Sheet/Dialog content
  // to avoid being inert/aria-hidden by Radix overlays.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = containerRef.current;
    // Prefer the closest open sheet/dialog content; fall back to body.
    const target = (el?.closest(
      '[data-slot="sheet-content"], [data-slot="dialog-content"]'
    ) as HTMLElement | null) ?? document.body;
    setPortalTarget(target);
  }, []);
  const onSelect = (option: SingleValue<{ label: string; value: string }>) => {
    onChange(option?.value);
  };

  const formattedValue = useMemo(() => {
    return options.find((option) => option.value === value);
  }, [options, value]);

  return (
    <div ref={containerRef}>
      <CreateableSelect
      placeholder={placeholder}
      className="text-sm h-10"
      menuPortalTarget={portalTarget}
      menuPosition="fixed"
      styles={{
        control: (base, state) => ({
          ...base,
          minHeight: 40,
          backgroundColor:
            resolvedTheme === "dark" ? "rgba(68, 71, 90, 0.30)" : "transparent",
          borderColor:
            resolvedTheme === "dark" ? "var(--input)" : "#e2e8f0",
          boxShadow: state.isFocused
            ? "0 0 0 3px rgba(137, 180, 250, 0.50)"
            : undefined,
          ":hover": {
            borderColor:
              resolvedTheme === "dark" ? "var(--input)" : "#e2e8f0",
          },
        }),
        valueContainer: (base) => ({
          ...base,
          padding: "0 8px",
        }),
        input: (base) => ({
          ...base,
          color: "var(--foreground)",
        }),
        placeholder: (base) => ({
          ...base,
          color: "var(--muted-foreground)",
        }),
        singleValue: (base) => ({
          ...base,
          color: "var(--foreground)",
        }),
        menu: (base) => ({
          ...base,
          backgroundColor:
            resolvedTheme === "dark" ? "var(--popover)" : "white",
          border: `1px solid ${
            resolvedTheme === "dark" ? "var(--border)" : "#e2e8f0"
          }`,
          boxShadow: "0 8px 24px 0 rgba(0,0,0,.12)",
          overflow: "hidden",
        }),
        menuList: (base) => ({
          ...base,
          backgroundColor:
            resolvedTheme === "dark" ? "var(--popover)" : "white",
        }),
        option: (base, state) => ({
          ...base,
          backgroundColor: state.isSelected
            ? "var(--accent)"
            : state.isFocused
            ? "rgba(137, 180, 250, 0.20)"
            : "transparent",
          color: state.isSelected
            ? "var(--accent-foreground)"
            : "var(--foreground)",
          ":active": {
            backgroundColor: "rgba(137, 180, 250, 0.30)",
          },
        }),
        dropdownIndicator: (base) => ({
          ...base,
          color: "var(--muted-foreground)",
          ":hover": { color: "var(--foreground)" },
        }),
        indicatorSeparator: (base) => ({
          ...base,
          backgroundColor: resolvedTheme === "dark" ? "var(--border)" : base.backgroundColor,
        }),
        menuPortal: (base) => ({
          ...base,
          // Keep the portal on top within the current stacking context
          zIndex: 9999,
          pointerEvents: "auto",
        }),
      }}
      value={formattedValue}
      onChange={onSelect}
      options={options}
      onCreateOption={onCreate}
      isDisabled={disabled}
    />
    </div>
  );
};
