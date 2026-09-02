/* global document, window */

const concepts = {
  chain: {
    name: "Chain of Custody",
    family: "Forensic dossier",
    mark: "01",
    thesis: "Every claim looks like an exhibit moving through a documented chain.",
    best: "We want proof, provenance, and auditability to lead.",
    risk: "It can feel legalistic if the language gets too severe.",
    type: "Condensed grotesk and monospaced evidence labels",
  },
  dual: {
    name: "Dual Authority",
    family: "Human and agent lanes",
    mark: "A/P",
    thesis: "Agent speed and human authority stay visible as two distinct lanes.",
    best: "We want the trust boundary to be understood immediately.",
    risk: "The split can become visually rigid if every feature is forced into two columns.",
    type: "Bold neo-grotesk and technical metadata",
  },
  redline: {
    name: "The Redline",
    family: "Living contract",
    mark: "R/",
    thesis: "Evaluation feels like reviewing a document where changes and caveats stay visible.",
    best: "We want review, negotiation, and honest exceptions to feel familiar.",
    risk: "It can look like legal software instead of a broad product evaluation room.",
    type: "Document serif, clean sans serif, and handwritten notes",
  },
  mission: {
    name: "Mission Control",
    family: "Field systems console",
    mark: "PR",
    thesis: "ProofRoom feels like an operating manual for inspecting evidence and moving a decision.",
    best: "We want a personal, direct, and unmistakably operational product identity.",
    risk: "The stencil display can overpower dense content if it appears outside short headlines.",
    type: "Black Ops One display and IBM Plex Mono interface type",
  },
  quiet: {
    name: "Quiet Assurance",
    family: "Institutional calm",
    mark: "P.",
    thesis: "Confidence comes from restraint, space, and an unhurried reading path.",
    best: "We want executive trust, maturity, and calm to lead.",
    risk: "Subtle status signals can become too quiet when something needs urgent attention.",
    type: "Editorial serif with restrained humanist sans serif",
  },
  spectrum: {
    name: "Proof Spectrum",
    family: "Evidence as a range",
    mark: "P/S",
    thesis: "Evidence quality is shown as a visible range instead of a simple pass or fail.",
    best: "We want nuance, confidence levels, and evidence quality to feel native.",
    risk: "Too much color can feel decorative unless every band has a clear meaning.",
    type: "Geometric sans serif with precise monospaced labels",
  },
  industrial: {
    name: "Industrial Standard",
    family: "Inspection instrument",
    mark: "PR",
    thesis: "The product feels like a repeatable inspection instrument built for scrutiny.",
    best: "We want rigor, durability, and operational credibility to lead.",
    risk: "The visual force can feel cold or overly mechanical for relationship-led buying.",
    type: "Stencil-inspired condensed display and inspection mono",
  },
};

const order = Object.keys(concepts);
const preview = document.querySelector("#brand-preview");
const controls = [...document.querySelectorAll("[data-theme-choice]")];
const fields = {
  index: document.querySelector("#concept-index"),
  family: document.querySelector("#concept-family"),
  name: document.querySelector("#concept-name"),
  thesis: document.querySelector("#concept-thesis"),
  best: document.querySelector("#concept-best"),
  risk: document.querySelector("#concept-risk"),
  type: document.querySelector("#concept-type"),
  mark: document.querySelector("#preview-mark"),
};

function setConcept(id, { updateHash = true } = {}) {
  const concept = concepts[id];
  if (!concept || !preview) {
    return;
  }

  preview.className = `brand-preview brand-preview--${id}`;
  document.documentElement.dataset.brand = id;

  fields.index.textContent = `${order.indexOf(id) + 1} of ${order.length}`;
  fields.family.textContent = concept.family;
  fields.name.textContent = concept.name;
  fields.thesis.textContent = concept.thesis;
  fields.best.textContent = concept.best;
  fields.risk.textContent = concept.risk;
  fields.type.textContent = concept.type;
  fields.mark.textContent = concept.mark;

  controls.forEach((control) => {
    const isActive = control.dataset.themeChoice === id;
    control.setAttribute("aria-pressed", String(isActive));
  });

  if (updateHash) {
    window.history.replaceState(null, "", `#${id}`);
  }
}

controls.forEach((control) => {
  control.addEventListener("click", () => {
    setConcept(control.dataset.themeChoice);
  });
});

window.addEventListener("hashchange", () => {
  const id = window.location.hash.slice(1);
  if (concepts[id]) {
    setConcept(id, { updateHash: false });
  }
});

const initial = window.location.hash.slice(1);
setConcept(concepts[initial] ? initial : "chain", { updateHash: false });
