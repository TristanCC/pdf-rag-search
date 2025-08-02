// page.tsx
import Image from "next/image";

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <form action="http://localhost:4000/uploadPDF" method="post" encType="multipart/form-data">
            <div className="flex gap-4">
              <input type="file" accept=".pdf" name="uploadedPDF" className="border-2 border-gray-500 cursor-pointer bg-white hover:bg-gray-100 text-black content-center justify-items-center"
              />
              <button type="submit" className="p-4 bg-gray-500 hover:bg-gray-600 cursor-pointer">Submit</button>
            </div>

          </form>
        </div>
      </main>
    </div>
  );
}
