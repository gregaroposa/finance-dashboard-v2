"use client";

import { useMemo } from "react";
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
  const onSelect = (option: SingleValue<{ label: string; value: string }>) => {
    onChange(option?.value);
  };

  const formattedValue = useMemo(() => {
    return options.find((option) => option.value === value);
  }, [options, value]);

  return (
    <CreateableSelect
      placeholder={placeholder}
      className="text-sm h-10"
      menuPortalTarget={typeof document !== "undefined" ? document.body : undefined}
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
          zIndex: 9999,
        }),
      }}
      value={formattedValue}
      onChange={onSelect}
      options={options}
      onCreateOption={onCreate}
      isDisabled={disabled}
    />
  );
};
