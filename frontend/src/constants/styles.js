// Shared inline style objects extracted from App.jsx

const smallBtn = {
  background: "none",
  border: "1px solid rgba(255,255,255,0.06)",
  borderRadius: 6,
  width: 30,
  height: 30,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: 13,
  transition: "background 0.15s",
};

const actionBtn = {
  width: 32,
  height: 32,
  borderRadius: 8,
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#e6edf3",
  fontSize: 18,
  fontWeight: 600,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "'JetBrains Mono', monospace",
  transition: "all 0.15s",
};

const labelStyle = {
  display: "block",
  fontSize: 12,
  fontWeight: 500,
  color: "rgba(255,255,255,0.4)",
  marginBottom: 6,
  fontFamily: "'JetBrains Mono', monospace",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1px solid rgba(255,255,255,0.1)",
  background: "rgba(255,255,255,0.04)",
  color: "#e6edf3",
  fontSize: 14,
  fontFamily: "'DM Sans', sans-serif",
  outline: "none",
  marginBottom: 14,
  boxSizing: "border-box",
};

const modalOverlay = {
  position: "fixed",
  inset: 0,
  zIndex: 1000,
  background: "rgba(0,0,0,0.7)",
  backdropFilter: "blur(8px)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
};

const modalBox = {
  background: "#0d1117",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 16,
  padding: "28px 28px 22px",
  width: "100%",
  maxWidth: 420,
  boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
};

const cancelBtn = {
  flex: 1,
  padding: "10px 0",
  borderRadius: 8,
  background: "rgba(255,255,255,0.05)",
  border: "1px solid rgba(255,255,255,0.1)",
  color: "#e6edf3",
  fontSize: 14,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};

const deleteBtn = {
  flex: 1,
  padding: "10px 0",
  borderRadius: 8,
  background: "#da3633",
  border: "none",
  color: "#fff",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
};

export {
  smallBtn,
  actionBtn,
  labelStyle,
  inputStyle,
  modalOverlay,
  modalBox,
  cancelBtn,
  deleteBtn,
};
