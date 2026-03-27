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

const gearButton = {
  position: "absolute",
  top: 0,
  right: 0,
  background: "transparent",
  border: "none",
  cursor: "pointer",
  fontSize: 24,
  padding: 4,
  lineHeight: 1,
  color: "rgba(255,255,255,0.4)",
  transition: "color 0.15s",
};

const settingsOverlay = {
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

const settingsPanel = {
  background: "#0d1117",
  border: "1px solid rgba(255,255,255,0.1)",
  borderRadius: 16,
  padding: "28px 28px 22px",
  width: "100%",
  maxWidth: 560,
  maxHeight: "80vh",
  overflowY: "auto",
  boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
};

const settingsHeader = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  paddingBottom: 16,
  marginBottom: 16,
  borderBottom: "1px solid rgba(255,255,255,0.08)",
};

const tabBar = {
  display: "flex",
  gap: 0,
  marginBottom: 24,
};

const tabButton = {
  padding: "12px 24px",
  background: "transparent",
  color: "#8b949e",
  border: "none",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 500,
  fontFamily: "'DM Sans', sans-serif",
  borderBottom: "2px solid transparent",
  transition: "all 0.15s",
};

const tabButtonActive = {
  padding: "12px 24px",
  background: "transparent",
  color: "#e6edf3",
  border: "none",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "'DM Sans', sans-serif",
  borderBottom: "2px solid #58a6ff",
  transition: "all 0.15s",
};

const integrationCard = {
  background: "#161b22",
  borderRadius: 8,
  padding: 16,
  marginBottom: 12,
  border: "1px solid #30363d",
};

const statusBadgeConnected = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 12,
  background: "#238636",
  color: "#fff",
  fontSize: 12,
  fontWeight: 500,
  fontFamily: "'JetBrains Mono', monospace",
};

const statusBadgeDisconnected = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 12,
  background: "#6e7681",
  color: "#fff",
  fontSize: 12,
  fontWeight: 500,
  fontFamily: "'JetBrains Mono', monospace",
};

const statusBadgeError = {
  display: "inline-block",
  padding: "2px 8px",
  borderRadius: 12,
  background: "#da3633",
  color: "#fff",
  fontSize: 12,
  fontWeight: 500,
  fontFamily: "'JetBrains Mono', monospace",
};

const syncButton = {
  padding: "6px 14px",
  borderRadius: 6,
  background: "rgba(88,166,255,0.1)",
  border: "1px solid rgba(88,166,255,0.3)",
  color: "#58a6ff",
  fontSize: 13,
  fontWeight: 500,
  cursor: "pointer",
  fontFamily: "'DM Sans', sans-serif",
  transition: "all 0.15s",
};

const connectButton = {
  background: "#238636",
  color: "#fff",
  padding: "8px 16px",
  borderRadius: 6,
  border: "none",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 600,
  fontFamily: "'DM Sans', sans-serif",
  transition: "all 0.15s",
};

const unitRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  padding: "8px 0",
  borderBottom: "1px solid #21262d",
};

const unitForm = {
  display: "flex",
  gap: 8,
  marginTop: 12,
};

const toastContainer = {
  position: "fixed",
  bottom: 24,
  right: 24,
  zIndex: 10000,
};

const toastSuccess = {
  background: "#238636",
  color: "#fff",
  padding: "12px 20px",
  borderRadius: 8,
  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 14,
  fontFamily: "'DM Sans', sans-serif",
};

const toastError = {
  background: "#da3633",
  color: "#fff",
  padding: "12px 20px",
  borderRadius: 8,
  boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
  display: "flex",
  alignItems: "center",
  gap: 8,
  fontSize: 14,
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
  gearButton,
  settingsOverlay,
  settingsPanel,
  settingsHeader,
  tabBar,
  tabButton,
  tabButtonActive,
  integrationCard,
  statusBadgeConnected,
  statusBadgeDisconnected,
  statusBadgeError,
  syncButton,
  connectButton,
  unitRow,
  unitForm,
  toastContainer,
  toastSuccess,
  toastError,
};
