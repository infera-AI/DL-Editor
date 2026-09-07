import { CheckCircle2, Clock3, FileAudio, FileVideo, Folder, TriangleAlert } from "lucide-react";

function CloudFilterIcon({ id }) {
  if (id === "video") return <FileVideo size={15} />;
  if (id === "audio") return <FileAudio size={15} />;
  if (id === "parsed") return <CheckCircle2 size={15} />;
  if (id === "processing") return <Clock3 size={15} />;
  if (id === "failed") return <TriangleAlert size={15} />;
  return <Folder size={15} />;
}

export { CloudFilterIcon };
