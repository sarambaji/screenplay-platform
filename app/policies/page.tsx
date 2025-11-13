'use client'

export default function CopyrightPage() {
  return (
    <main className="min-h-screen bg-black text-white py-16 px-6 flex justify-center">
      <div className="max-w-3xl space-y-8">
        <h1 className="text-3xl font-semibold">Copyright & Privacy Policy</h1>

        <p className="text-zinc-300 text-sm leading-relaxed">
          Your stories are yours — always. <span className="font-semibold text-white">Screenplay Beta </span> 
          was built to give writers a safe place to share, and readers a chance to discover great scripts without compromise. 
          Below is how we protect both your creative rights and your personal data.
        </p>

        {/* COPYRIGHT SECTION */}
        <section className="space-y-5 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-lg font-medium text-white">1. Copyright & Ownership</h2>
          <p>
            Every screenplay uploaded to <span className="font-semibold text-white">Screenplay Beta </span> 
            remains the sole property of its author. We do not claim ownership, redistribute, or sell your work. 
            Each upload is automatically timestamped when submitted, creating a verifiable record of authorship.
          </p>
          <p>
            You can make your screenplay <strong>public</strong> (readable by others) or keep it <strong>private </strong> 
            (visible only to you). You can delete your screenplay at any time — removal is permanent, and we do not 
            retain backups of deleted content.
          </p>
          <p>
            By uploading, you grant <span className="font-semibold text-white">Screenplay Beta</span> a limited license 
            to display your work on our platform. This license exists solely for presentation within our cinematic reader 
            and does not extend to marketing, AI training, or distribution outside the site.
          </p>
        </section>

        {/* PRIVACY SECTION */}
        <section className="space-y-5 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-lg font-medium text-white">2. Privacy & Security</h2>
          <p>
            We use <strong>Supabase</strong> for secure storage and authentication. 
            Each upload is stored privately by default and protected by Row-Level Security (RLS), 
            meaning only you as the author can access your private screenplays. 
            Even our team cannot view them without your explicit consent.
          </p>
          <p>
            We collect only the information necessary to create and maintain your account, such as your email, username, 
            and password. We do not sell, rent, or share personal data. 
            Comments and likes are tied to your username only, not your email or any other identifier.
          </p>
          <p>
            If you delete your account, all associated data — including your screenplays, comments, and likes — is permanently removed. 
            We do not archive or retain deleted user content.
          </p>
          <p>
            We use minimal analytics to understand platform performance (for example, total reads or likes) 
            but never sell or share this data with third parties.
          </p>
        </section>

        {/* USER RIGHTS */}
        <section className="space-y-5 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-lg font-medium text-white">3. Your Rights</h2>
          <ul className="list-disc pl-5 space-y-2">
            <li>You own your creative work, and you control its visibility and deletion.</li>
            <li>You can request complete data deletion at any time by removing your account.</li>
            <li>You can edit or remove public screenplays, comments, or likes you’ve made.</li>
            <li>We will never use your content for training AI models or third-party purposes.</li>
          </ul>
        </section>

        {/* CONTACT / LAST UPDATED */}
        <section className="space-y-3 text-sm text-zinc-300 leading-relaxed">
          <h2 className="text-lg font-medium text-white">4. Questions or Concerns</h2>
          <p>
            If you have questions about how we handle data or your creative rights, 
            you can reach out anytime at <span className="text-white font-mono">support@screenplaybeta.com</span>.
          </p>
        </section>

        <footer className="border-t border-zinc-800 pt-6 text-xs text-zinc-500">
          Last updated: November 2025
        </footer>
      </div>
    </main>
  )
}
