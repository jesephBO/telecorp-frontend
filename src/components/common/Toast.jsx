export default function Toast({ setToast, toast }) {
  return <div className="toast" role="status">{toast}<button onClick={() => setToast('')}>×</button></div>;
}
