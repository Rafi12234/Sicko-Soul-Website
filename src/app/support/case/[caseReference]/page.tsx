import Navbar from "@/components/ui/Navbar";
import ComplaintCaseFile from "@/components/commerce/ComplaintCaseFile";

type Props = { params: Promise<{ caseReference: string }> };

export default async function SupportCasePage({ params }: Props) {
  const { caseReference } = await params;
  return (
    <>
      <Navbar />
      <ComplaintCaseFile caseReference={decodeURIComponent(caseReference)} />
    </>
  );
}
