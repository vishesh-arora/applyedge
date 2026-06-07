import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center px-4 text-center bg-[#F8FAFC]">
      <h1 className="text-5xl font-display text-[#0F4C81] mb-4">
        ApplyEdge
      </h1>
      <p className="text-xl text-gray-600 mb-8 max-w-lg">
        Get more recruiter callbacks. ATS-optimised resumes and LinkedIn profiles for product professionals.
      </p>
      <Link
        href="/dashboard"
        className="bg-[#0F4C81] text-white px-8 py-3 rounded-lg font-medium hover:bg-[#0a3560] transition-colors"
      >
        Get Started — It's Free
      </Link>
    </main>
  );
}
