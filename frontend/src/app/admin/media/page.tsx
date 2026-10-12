"use client";
import {useAdminSession} from "@/components/admin/AdminSessionProvider";
import AdminPageHeading from "@/components/admin/AdminPageHeading";
import SiteMediaEditor from "@/components/admin/SiteMediaEditor";
import StreetsMediaEditor from "@/components/admin/StreetsMediaEditor";
export default function Page(){const {token}=useAdminSession();return <><AdminPageHeading eyebrow="Workspace / Cloudinary" title="SITE MEDIA" description="Upload and manage Hero, New Drop, Streets and Lookbook media. Files transfer to Cloudinary before their secure URLs are saved in MySQL."/><div className="space-y-10"><SiteMediaEditor token={token}/><StreetsMediaEditor token={token}/></div></>}
