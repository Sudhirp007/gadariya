"use client";

import React from "react";
import { useTranslation } from "@/lib/i18n/context";
import { BrandLogo } from "./BrandLogo";

export function AppFooter() {
  const { t } = useTranslation();

  return (
    <footer className="border-t border-warmgrey bg-white py-12 text-charcoal text-sm">
      <div className="max-w-6xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-3">
          <BrandLogo isLight={false} />
          <p className="text-charcoal-light text-xs leading-relaxed max-w-sm">
            {t("footer.desc")}
          </p>
        </div>
        <div>
          <div className="font-bold text-plum mb-3">
            {t("footer.privacyGuarantees")}
          </div>
          <ul className="text-xs space-y-1.5 text-charcoal-light">
            <li className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-forest"></span>
              <span>{t("footer.rule1")}</span>
            </li>
            <li className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-forest"></span>
              <span>{t("footer.rule2")}</span>
            </li>
            <li className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-forest"></span>
              <span>{t("footer.rule3")}</span>
            </li>
            <li className="flex items-center space-x-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-forest"></span>
              <span>{t("footer.rule4")}</span>
            </li>
          </ul>
        </div>
        <div>
          <div className="font-bold text-plum mb-3">
            {t("common.tagline")}
          </div>
          <p className="text-xs text-charcoal-light leading-relaxed">
            संपर्क एवं सहयोग: <span className="font-semibold text-plum">support@palmatrimony.in</span>.
            पाल (गड़ेरिया) समाज की आधिकारिक एवं मर्यादित सेवा।
          </p>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-4 mt-8 pt-6 border-t border-warmgrey text-center text-xs text-charcoal-light">
        {t("footer.copyright")}
      </div>
    </footer>
  );
}
