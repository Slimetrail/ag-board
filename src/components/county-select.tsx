import { useEffect, useState } from "react";
import { STATE_META, isStateCode, type StateCode } from "@/lib/geo";
import { getBoardSettings } from "@/lib/office";
import { cn } from "@/lib/utils";

export function CountySelect({
  value,
  state = "SC",
  onChange,
  id,
  name,
  allowAll = false,
  required = false,
  className,
}: {
  value: string;
  state?: string;
  onChange: (value: string, state: string) => void;
  id?: string;
  name?: string;
  allowAll?: boolean;
  required?: boolean;
  className?: string;
}) {
  const [enabled, setEnabled] = useState<StateCode[]>(["SC"]);
  const currentState: StateCode = isStateCode(state) ? state : "SC";

  useEffect(() => {
    void getBoardSettings()
      .then((settings) => setEnabled(settings.enabledStates))
      .catch(() => setEnabled(["SC"]));
  }, []);

  const groups = STATE_META[currentState].groups;
  const showState = enabled.length > 1;

  return (
    <div className={cn("grid gap-2", showState && "sm:grid-cols-2")}>
      {showState ? (
        <select
          aria-label="State"
          value={currentState}
          onChange={(event) => onChange("", event.target.value)}
          className={cn(
            "flex h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-fg transition-[border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 md:text-sm",
            className,
          )}
        >
          {enabled.map((code) => (
            <option key={code} value={code}>
              {STATE_META[code].name}
            </option>
          ))}
        </select>
      ) : null}
      <select
        id={id}
        name={name}
        required={required}
        value={value}
        onChange={(event) => onChange(event.target.value, currentState)}
        aria-label="County"
        className={cn(
          "flex h-11 w-full rounded-md border border-border bg-surface px-3 text-base text-fg transition-[border-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
          className,
        )}
      >
        <option value="">
          {allowAll
            ? `All of ${STATE_META[currentState].name}`
            : "Choose a county"}
        </option>
        {groups.map((group) => (
          <optgroup key={group.name} label={group.name}>
            {group.counties.map((county) => (
              <option key={county} value={county}>
                {county} County
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </div>
  );
}
