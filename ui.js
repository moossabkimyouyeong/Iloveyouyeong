import { ABILITY_LABEL } from "./abilities.js";

export class UIController {
  constructor() {
    this.abilityEl = document.getElementById("abilityName");
    this.statusEl = document.getElementById("status");
    this.trainButtons = [...document.querySelectorAll("[data-gesture]")];
    this.clearBtn = document.getElementById("clearData");
  }

  setAbility(ability) {
    this.abilityEl.textContent = ability ? ABILITY_LABEL[ability] ?? ability : "대기";
  }

  setStatus(text) {
    this.statusEl.textContent = text;
  }

  setTrainingDisabled(disabled) {
    this.trainButtons.forEach((btn) => {
      btn.disabled = disabled;
    });
    this.clearBtn.disabled = disabled;
  }
}
