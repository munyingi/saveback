import { getRequests } from "@/lib/requests";
import { RequestsList } from "@/components/app/RequestsList";

export const metadata = { title: "Requests" };

export default async function RequestsPage() {
  const requests = await getRequests();

  return (
    <div className="body">
      <div className="lead">
        Requests <span className="sub">· they saved you first</span>
      </div>
      <RequestsList requests={requests} />
    </div>
  );
}
