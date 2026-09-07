

function CloudMetric({ icon, label, value }) {
  return (
    <div className="cloud-metric">
      {icon}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

export { CloudMetric };
