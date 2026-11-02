"use client";

import React from "react";
import { useTranslation } from "@/lib/i18n/context";

export function AppFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-stone-200 bg-stone-50 py-10 text-stone-600 text-sm">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <div className="font-bold text-stone-900 mb-2">
            {t("common.appName")} (gadariya.org)
          </div>
          <p className="text-stone-500 text-xs leading-relaxed">
            {t("footer.desc")}
          </p>
        </div>
        <div>
          <div className="font-bold text-stone-900 mb-2">
            {t("footer.privacyGuarantees")}
          </div>
          <ul className="text-xs space-y-1 text-stone-500">
            <li>• {t("footer.rule1")}</li>
            <li>• {t("footer.rule2")}</li>
            <li>• {t("footer.rule3")}</li>
            <li>• {t("footer.rule4")}</li>
          </ul>
        </div>
        <div>
          <div className="font-bold text-stone-900 mb-2">
            {t("common.tagline")}
          </div>
          <p className="text-xs text-stone-500 leading-relaxed">
            संपर्क एवं सहयोग: <span className="font-medium text-stone-800">support@palmatrimony.in</span>.
            पाल (गड़ेरिया) समाज की आधिकारिक सेवा।
          </p>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 mt-8 pt-4 border-t border-stone-200 text-center text-xs text-stone-400">
        {t("footer.copyright")}
      </div>
    </footer>
  );
}
