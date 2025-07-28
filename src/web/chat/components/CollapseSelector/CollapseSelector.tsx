import React from "react";
import { ChevronDown, ChevronRight, Code } from "lucide-react";
import {
  DropdownSelector,
  DropdownOption,
} from "@/web/common/components/DropdownSelector";
import { usePreferencesContext } from "../../contexts/PreferencesContext";
import {
  COLLAPSE_MODE_VALUES,
  type CollapseMode,
} from "../../constants/collapse-modes";
import { COLLAPSE_MODE_UI } from "../../config/collapse-mode-ui";
import styles from "./CollapseSelector.module.css";

interface CollapseSelectorProps {
  className?: string;
}

const COLLAPSE_OPTIONS: DropdownOption<CollapseMode>[] =
  COLLAPSE_MODE_VALUES.map((mode) => ({
    value: mode,
    label: COLLAPSE_MODE_UI[mode].label,
    description: COLLAPSE_MODE_UI[mode].description,
  }));

function getCollapseIcon(mode: CollapseMode) {
  const iconName = COLLAPSE_MODE_UI[mode].icon;
  const icons = {
    "chevron-down": <ChevronDown size={14} />,
    code: <Code size={14} />,
    "chevron-right": <ChevronRight size={14} />,
  } as const;
  return icons[iconName];
}

function getCollapseLabel(mode: CollapseMode): string {
  return COLLAPSE_MODE_UI[mode].label;
}

export function CollapseSelector({ className }: CollapseSelectorProps) {
  const { toolCollapseMode, setToolCollapseMode } = usePreferencesContext();
  const [isOpen, setIsOpen] = React.useState(false);

  const handleModeChange = (mode: CollapseMode) => {
    setToolCollapseMode(mode);
  };

  const renderTrigger = ({
    isOpen,
    value,
    onClick,
  }: {
    isOpen: boolean;
    value?: CollapseMode;
    onClick: () => void;
  }) => (
    <button
      className={`${styles.trigger} ${isOpen ? styles.triggerOpen : ""}`}
      onClick={onClick}
      title="Tool collapse settings"
      type="button"
    >
      <div className={styles.triggerContent}>
        {value && getCollapseIcon(value)}
        <span className={styles.triggerText}>
          {value ? getCollapseLabel(value) : "Collapse"}
        </span>
        <ChevronDown size={12} className={styles.triggerArrow} />
      </div>
    </button>
  );

  const renderOption = (option: DropdownOption<CollapseMode>) => (
    <div className={styles.optionContent}>
      <div className={styles.optionHeader}>
        {getCollapseIcon(option.value)}
        <span className={styles.optionLabel}>{option.label}</span>
      </div>
      {option.description && (
        <span className={styles.optionDescription}>{option.description}</span>
      )}
    </div>
  );

  return (
    <div className={`${styles.container} ${className || ""}`}>
      <DropdownSelector<CollapseMode>
        options={COLLAPSE_OPTIONS}
        value={toolCollapseMode}
        onChange={handleModeChange}
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        renderTrigger={renderTrigger}
        renderOption={renderOption}
        showFilterInput={false}
        dropdownClassName={styles.dropdown}
        maxHeight={300}
      />
    </div>
  );
}
