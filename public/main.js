// =========================
// Utilitas kecil untuk DOM
// =========================

/**
 * Membuat elemen HTML dengan atribut dan anak tertentu.
 * @param {string} tag - Nama tag HTML.
 * @param {Object} [options] - Opsi atribut, class, event, dsb.
 * @returns {HTMLElement}
 */
function createElement(tag, options = {}) {
  const el = document.createElement(tag);

  const { className, text, attrs, onClick } = options;

  if (className) {
    el.className = className;
  }

  if (text) {
    el.textContent = text;
  }

  if (attrs) {
    Object.entries(attrs).forEach(([key, value]) => {
      el.setAttribute(key, value);
    });
  }

  if (onClick) {
    el.addEventListener("click", onClick);
  }

  return el;
}

/**
 * Format harga sederhana (jika data harga ada).
 * Di sini diasumsikan harga sudah berupa string yang sesuai.
 */
function formatHarga(value) {
  if (value == null || value === "") return "-";
  return String(value);
}

// =========================
// API Client (modular)
// =========================

/**
 * Mengambil daftar koleksi dari backend.
 * Endpoint: GET /api/get-koleksi
 */
async function fetchKoleksi() {
  const response = await fetch("/api/get-koleksi");

  if (!response.ok) {
    throw new Error("Gagal memuat katalog (" + response.status + ")");
  }

  const json = await response.json();

  // Struktur data diasumsikan mengikuti spesifikasi:
  // { source: "...", data: [ { id, judul, pencipta, tahun, harga, path } ] }
  return json;
}

/**
 * Mengambil detail satu koleksi berdasarkan ID.
 * Endpoint: GET /api/get-detail?id=<id>
 */
async function fetchDetail(id) {
  const response = await fetch("/api/get-detail?id=" + encodeURIComponent(id));

  if (!response.ok) {
    throw new Error("Gagal memuat detail (" + response.status + ")");
  }

  const json = await response.json();

  // Backend mengembalikan bentuk:
  // { source: "...", data: { id, judul, pencipta, tahun, harga, path } }
  // Kembalikan langsung objek detailnya agar pemanggil mendapat satu objek karya.
  return json && json.data ? json.data : json;
}

/**
 * Mengambil fortune message untuk footer.
 * Endpoint: GET /api/fortune
 */
async function fetchFortune() {
  const response = await fetch("/api/fortune");

  if (!response.ok) {
    throw new Error("Gagal memuat fortune (" + response.status + ")");
  }

  return response.json();
}

// =========================
// Render katalog & interaksi
// =========================

/**
 * Membuat elemen kartu koleksi.
 * @param {Object} item - Data koleksi dari API.
 * @param {Function} onToggleDetail - Handler saat user klik untuk buka/tutup detail.
 */
function createCardElement(item, onToggleDetail) {
  const card = createElement("article", {
    className: "card",
    attrs: { "data-id": item.id },
  });

  // Bagian media (gambar / video)
  const mediaWrapper = createElement("div", {
    className: "card__media-wrapper",
  });

  const isVideo =
    typeof item.path === "string" &&
    item.path.toLowerCase().endsWith(".mp4");

  const mediaElement = isVideo
    ? createElement("video", {
        className: "card__media",
        attrs: {
          src: item.path,
          controls: "controls",
        },
      })
    : createElement("img", {
        className: "card__media",
        attrs: {
          src: item.path,
          alt: item.judul || "Koleksi",
          loading: "lazy",
        },
      });

  const overlay = createElement("div", {
    className: "card__media-overlay",
  });

  const overlayLabel = createElement("span", {
    className: "card__media-label",
    text: "Lihat detail",
  });

  overlay.appendChild(overlayLabel);
  mediaWrapper.appendChild(mediaElement);
  mediaWrapper.appendChild(overlay);

  // Bagian teks utama
  const body = createElement("div", {
    className: "card__body",
  });

  // Judul bisa diklik (button agar lebih aksesibel)
  const titleButton = createElement("button", {
    className: "card__title-button",
    onClick: (event) => {
      event.preventDefault();
      onToggleDetail(item.id, card);
    },
  });

  const title = createElement("h3", {
    className: "card__title",
    text: item.judul || "Tanpa judul",
  });

  titleButton.appendChild(title);

  const subtitle = createElement("p", {
    className: "card__subtitle",
    text: item.pencipta || "Pencipta tidak diketahui",
  });

  const metaRow = createElement("div", {
    className: "card__meta-row",
  });

  const tahunTag = createElement("span", {
    className: "card__tag",
    text: item.tahun || "Tahun tidak diketahui",
  });

  const sourceTag = createElement("span", {
    className: "card__tag",
    text: "ID: " + item.id,
  });

  metaRow.appendChild(tahunTag);
  metaRow.appendChild(sourceTag);

  body.appendChild(titleButton);
  body.appendChild(subtitle);
  body.appendChild(metaRow);

  // Klik pada gambar juga membuka detail (tapi jangan ganggu interaksi video)
  if (!isVideo) {
    mediaWrapper.addEventListener("click", () => onToggleDetail(item.id, card));
  } else {
    // Overlay bikin kontrol video sulit diklik, jadi matikan untuk video.
    overlay.style.display = "none";
  }

  card.appendChild(mediaWrapper);
  card.appendChild(body);

  return card;
}

/**
 * Membuat node detail (bagian yang muncul di bawah kartu).
 * @param {Object} detail - Objek detail dari API detail.
 * @param {Object} [options] - Opsi status loading/error.
 */
function createDetailElement(detail, options = {}) {
  const { isLoading = false, errorMessage = null } = options;

  const wrapper = createElement("div", {
    className: "card__detail",
  });

  if (isLoading) {
    // Indikator loading untuk area detail
    const loader = createElement("div", {
      className: "loader-inline",
    });

    loader.appendChild(
      createElement("span", {
        className: "loader-inline__dot",
      })
    );
    loader.appendChild(
      createElement("span", {
        className: "loader-inline__dot",
      })
    );
    loader.appendChild(
      createElement("span", {
        className: "loader-inline__dot",
      })
    );
    loader.appendChild(
      createElement("span", {
        text: "Memuat detail koleksi...",
      })
    );

    wrapper.appendChild(loader);
    return wrapper;
  }

  if (errorMessage) {
    const status = createElement("p", {
      className: "card__detail-status card__detail-status--error",
      text: errorMessage,
    });

    wrapper.appendChild(status);
    return wrapper;
  }

  // Baris detail pencipta
  const rowPencipta = createElement("div", {
    className: "card__detail-row",
  });
  rowPencipta.appendChild(
    createElement("span", {
      className: "card__detail-label",
      text: "Pencipta",
    })
  );
  rowPencipta.appendChild(
    createElement("span", {
      className: "card__detail-value",
      text: detail.pencipta || "-",
    })
  );

  // Baris detail harga
  const rowHarga = createElement("div", {
    className: "card__detail-row",
  });
  rowHarga.appendChild(
    createElement("span", {
      className: "card__detail-label",
      text: "Harga",
    })
  );
  rowHarga.appendChild(
    createElement("span", {
      className: "card__detail-value card__detail-price",
      text: formatHarga(detail.harga),
    })
  );

  // Baris detail tahun
  const rowTahun = createElement("div", {
    className: "card__detail-row",
  });
  rowTahun.appendChild(
    createElement("span", {
      className: "card__detail-label",
      text: "Tahun",
    })
  );
  rowTahun.appendChild(
    createElement("span", {
      className: "card__detail-value",
      text: detail.tahun || "-",
    })
  );

  wrapper.appendChild(rowPencipta);
  wrapper.appendChild(rowHarga);
  wrapper.appendChild(rowTahun);

  const statusText = createElement("p", {
    className: "card__detail-status",
    text: "Detail karya diambil dari server.",
  });

  wrapper.appendChild(statusText);

  return wrapper;
}

/**
 * Merender state "skeleton" sementara saat katalog masih di-load.
 */
function renderSkeletonGrid(container, count = 6) {
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const card = createElement("article", {
      className: "card",
    });

    const media = createElement("div", {
      className: "card__media skeleton",
    });

    const body = createElement("div", {
      className: "card__body",
    });

    const titleSkeleton = createElement("div", {
      className: "skeleton",
    });
    titleSkeleton.style.height = "1rem";
    titleSkeleton.style.borderRadius = "999px";
    titleSkeleton.style.marginBottom = "0.4rem";

    const subtitleSkeleton = createElement("div", {
      className: "skeleton",
    });
    subtitleSkeleton.style.height = "0.8rem";
    subtitleSkeleton.style.borderRadius = "999px";
    subtitleSkeleton.style.width = "60%";

    body.appendChild(titleSkeleton);
    body.appendChild(subtitleSkeleton);

    card.appendChild(media);
    card.appendChild(body);
    container.appendChild(card);
  }
}

// =========================
// Inisialisasi halaman
// =========================

document.addEventListener("DOMContentLoaded", () => {
  const catalogGrid = document.getElementById("catalog-grid");
  const catalogStatus = document.getElementById("catalog-status");
  const catalogMeta = document.getElementById("catalog-meta");
  const fortuneText = document.getElementById("fortune-text");

  let openDetailCardId = null;

  /**
   * Meng-handle klik pada gambar / judul untuk toggle detail.
   * - Jika belum terbuka → load detail dari API lalu tampilkan di bawah kartu.
   * - Jika sudah terbuka → tutup detail.
   */
  async function handleToggleDetail(id, cardElement) {
    // Jika kartu yang sama diklik lagi → tutup detail
    if (openDetailCardId === id) {
      const existingDetail = cardElement.querySelector(".card__detail");
      if (existingDetail) {
        existingDetail.remove();
      }
      openDetailCardId = null;
      return;
    }

    // Tutup detail pada kartu lain jika ada
    const currentOpenDetail = document.querySelector(".card__detail");
    if (currentOpenDetail && currentOpenDetail.parentElement) {
      currentOpenDetail.parentElement.removeChild(currentOpenDetail);
    }

    // Tampilkan placeholder loading pada kartu yang diklik
    const loadingDetail = createDetailElement(null, { isLoading: true });
    cardElement.appendChild(loadingDetail);
    openDetailCardId = id;

    try {
      const detail = await fetchDetail(id);

      // Jika selama loading user sudah klik kartu lain, jangan override
      if (openDetailCardId !== id) {
        return;
      }

      const newDetailEl = createDetailElement(detail);
      loadingDetail.replaceWith(newDetailEl);
    } catch (error) {
      // Jika gagal, tampilkan pesan error pada area detail
      if (openDetailCardId === id) {
        const errorDetail = createDetailElement(null, {
          errorMessage: "Tidak dapat memuat detail koleksi. Silakan coba lagi.",
        });
        loadingDetail.replaceWith(errorDetail);
      }
      // Versi singkat untuk konsol dev
      console.error("Error memuat detail:", error);
    }
  }

  /**
   * Memuat dan merender daftar koleksi dari API.
   */
  async function initCatalog() {
    catalogStatus.textContent = "Memuat katalog koleksi…";
    catalogStatus.classList.remove("status--error");

    // Render skeleton awal
    renderSkeletonGrid(catalogGrid, 6);

    try {
      const { data = [], source } = await fetchKoleksi();

      // Jika berhasil, hapus skeleton dan render kartu asli
      catalogGrid.innerHTML = "";

      if (!Array.isArray(data) || data.length === 0) {
        catalogStatus.textContent = "Belum ada koleksi yang tersedia.";
        catalogMeta.textContent = "";
        return;
      }

      data.forEach((item) => {
        const card = createCardElement(item, handleToggleDetail);
        catalogGrid.appendChild(card);
      });

      catalogStatus.textContent = "";
      catalogMeta.textContent =
        data.length +
        " karya ditampilkan" +
        (source ? " · Sumber: " + source : "");
    } catch (error) {
      // Jika API gagal, tampilkan pesan error yang jelas
      catalogGrid.innerHTML = "";
      catalogStatus.textContent =
        "Terjadi kesalahan saat memuat katalog. Silakan coba muat ulang halaman.";
      catalogStatus.classList.add("status--error");
      catalogMeta.textContent = "";
      console.error("Error memuat katalog:", error);
    }
  }

  /**
   * Memuat fortune dari API dan menampilkannya di footer.
   */
  async function initFortune() {
    fortuneText.textContent = "Mengambil fortune untukmu…";

    try {
      const json = await fetchFortune();
      // Berdasarkan contoh backend, diasumsikan { fortune: "..." }
      const fortune = json && (json.fortune || json.message || "");

      if (!fortune) {
        fortuneText.textContent = "Hari ini milikmu—buat sesuatu yang bermakna.";
      } else {
        fortuneText.textContent = fortune;
      }
    } catch (error) {
      // Jangan terlalu mengganggu UX jika fortune gagal
      fortuneText.textContent =
        "Tidak dapat memuat fortune saat ini, tapi tetap semangat berkarya.";
      console.error("Error memuat fortune:", error);
    }
  }

  // Mulai inisialisasi halaman
  initCatalog();
  initFortune();
});

