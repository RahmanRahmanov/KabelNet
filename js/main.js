"use strict";

(() => {
  const STORAGE_KEYS = {
    theme: "kabelnet:theme",
    user: "kabelnet:user",
    requests: "kabelnet:requests"
  };

  const requestStatuses = ["Новая", "В обработке", "Запланирована"];

  const qs = (selector, scope = document) => scope.querySelector(selector);
  const qsa = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

  document.addEventListener("DOMContentLoaded", () => {
    initPreloader();
    initHeader();
    initTheme();
    initBurgerMenu();
    initBackToTop();
    initAccordion();
    initModals();
    initOrderForm();
    initServicesFilter();
    initDashboard();
    initContactForm();
  });

  function initPreloader() {
    const preloader = qs("[data-preloader]");
    if (!preloader) return;

    const hide = () => {
      preloader.classList.add("is-loaded");
      setTimeout(() => preloader.remove(), 320);
    };

    if (document.readyState === "complete") {
      hide();
    } else {
      window.addEventListener("load", hide, { once: true });
      setTimeout(hide, 900);
    }
  }

  function initHeader() {
    const header = qs("[data-header]");
    if (!header) return;

    const updateHeader = () => {
      header.classList.toggle("is-scrolled", window.scrollY > 8);
    };

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
  }

  function initTheme() {
    const toggle = qs("[data-theme-toggle]");
    const savedTheme = localStorageGet(STORAGE_KEYS.theme, "light");
    applyTheme(savedTheme);

    if (!toggle) return;

    toggle.addEventListener("click", () => {
      const nextTheme = document.body.classList.contains("dark-theme") ? "light" : "dark";
      applyTheme(nextTheme);
      localStorageSet(STORAGE_KEYS.theme, nextTheme);
      showToast(nextTheme === "dark" ? "Темная тема включена" : "Светлая тема включена", "success");
    });
  }

  function applyTheme(theme) {
    document.body.classList.toggle("dark-theme", theme === "dark");
  }

  function initBurgerMenu() {
    const burger = qs("[data-burger]");
    const nav = qs("#mainNav");
    if (!burger || !nav) return;

    const closeMenu = () => {
      burger.classList.remove("is-open");
      nav.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
    };

    burger.addEventListener("click", () => {
      const isOpen = nav.classList.toggle("is-open");
      burger.classList.toggle("is-open", isOpen);
      burger.setAttribute("aria-expanded", String(isOpen));
    });

    qsa(".site-nav__link", nav).forEach((link) => {
      link.addEventListener("click", closeMenu);
    });

    document.addEventListener("click", (event) => {
      if (!nav.classList.contains("is-open")) return;
      if (nav.contains(event.target) || burger.contains(event.target)) return;
      closeMenu();
    });
  }

  function initBackToTop() {
    const button = qs("[data-back-top]");
    if (!button) return;

    const updateButton = () => {
      button.classList.toggle("is-visible", window.scrollY > 420);
    };

    button.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });

    updateButton();
    window.addEventListener("scroll", updateButton, { passive: true });
  }

  function initAccordion() {
    qsa("[data-accordion]").forEach((accordion) => {
      qsa(".faq__question", accordion).forEach((button) => {
        button.setAttribute("aria-expanded", "false");

        button.addEventListener("click", () => {
          const item = button.closest(".faq__item");
          if (!item) return;

          const answer = qs(".faq__answer", item);
          if (!answer) return;

          const isOpen = item.classList.contains("is-open");

          qsa(".faq__item", accordion).forEach((currentItem) => {
            const currentAnswer = qs(".faq__answer", currentItem);
            const currentButton = qs(".faq__question", currentItem);
            currentItem.classList.remove("is-open");
            if (currentAnswer) currentAnswer.style.maxHeight = null;
            if (currentButton) currentButton.setAttribute("aria-expanded", "false");
          });

          if (!isOpen) {
            item.classList.add("is-open");
            answer.style.maxHeight = `${answer.scrollHeight}px`;
            button.setAttribute("aria-expanded", "true");
          }
        });
      });
    });
  }

  function initModals() {
    const modalButtons = qsa("[data-open-modal]");
    const closeButtons = qsa("[data-close-modal]");

    modalButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const modalId = button.dataset.openModal;
        const selectedPlan = button.dataset.plan;
        openModal(modalId, selectedPlan);
      });
    });

    closeButtons.forEach((button) => {
      button.addEventListener("click", () => {
        closeModal(button.closest(".modal"));
      });
    });

    document.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      const open = qs(".modal.is-open");
      if (open) closeModal(open);
    });
  }

  function openModal(modalId, selectedPlan) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    const planInput = qs("#orderPlan", modal);
    if (planInput && selectedPlan) {
      planInput.value = selectedPlan;
    }

    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modal-open");

    const firstInput = qs("input:not([type='hidden']), select, textarea", modal);
    if (firstInput) firstInput.focus();
  }

  function closeModal(modal) {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modal-open");
  }

  function initOrderForm() {
    const form = qs("#orderForm");
    if (!form) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!validateForm(form)) {
        showToast("Проверьте поля формы", "error");
        return;
      }

      const formData = new FormData(form);
      const user = {
        name: String(formData.get("name")).trim(),
        phone: String(formData.get("phone")).trim()
      };

      const request = createRequest({
        service: String(formData.get("plan")).trim() || "Заявка на подключение",
        address: String(formData.get("address")).trim(),
        comment: "Создано через форму подключения",
        status: "Новая"
      });

      localStorageSet(STORAGE_KEYS.user, user);
      saveRequests([request, ...getRequests()]);
      form.reset();
      closeModal(form.closest(".modal"));
      showToast("Заявка сохранена в личном кабинете", "success");
      renderDashboard();
    });
  }

  function initServicesFilter() {
    const filterButtons = qsa("[data-filter]");
    const cards = qsa("[data-category]");
    if (!filterButtons.length || !cards.length) return;

    filterButtons.forEach((button) => {
      button.addEventListener("click", () => {
        const filter = button.dataset.filter;

        filterButtons.forEach((item) => item.classList.remove("is-active"));
        button.classList.add("is-active");

        cards.forEach((card) => {
          const isVisible = filter === "all" || card.dataset.category === filter;
          card.classList.toggle("is-filtered", !isVisible);
        });
      });
    });
  }

  function initDashboard() {
    const loginForm = qs("#loginForm");
    const logoutBtn = qs("#logoutBtn");
    const requestForm = qs("#requestForm");
    const requestList = qs("#requestList");

    if (!loginForm && !requestForm && !requestList) return;

    renderDashboard();

    if (loginForm) {
      loginForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!validateForm(loginForm)) {
          showToast("Введите имя и телефон", "error");
          return;
        }

        const formData = new FormData(loginForm);
        const user = {
          name: String(formData.get("name")).trim(),
          phone: String(formData.get("phone")).trim()
        };

        localStorageSet(STORAGE_KEYS.user, user);
        loginForm.reset();
        renderDashboard();
        showToast("Вы вошли в личный кабинет", "success");
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        localStorage.removeItem(STORAGE_KEYS.user);
        renderDashboard();
        showToast("Вы вышли из кабинета", "success");
      });
    }

    if (requestForm) {
      requestForm.addEventListener("submit", (event) => {
        event.preventDefault();
        if (!validateForm(requestForm)) {
          showToast("Заполните обязательные поля заявки", "error");
          return;
        }

        const formData = new FormData(requestForm);
        const status = requestStatuses[Math.floor(Math.random() * requestStatuses.length)];
        const request = createRequest({
          service: String(formData.get("service")).trim(),
          address: String(formData.get("address")).trim(),
          comment: String(formData.get("comment")).trim() || "Без комментария",
          status
        });

        saveRequests([request, ...getRequests()]);
        requestForm.reset();
        renderDashboard();
        showToast("Новая заявка добавлена", "success");
      });
    }

    if (requestList) {
      requestList.addEventListener("click", (event) => {
        const deleteButton = event.target.closest("[data-delete-id]");
        if (!deleteButton) return;

        const id = deleteButton.dataset.deleteId;
        const nextRequests = getRequests().filter((request) => request.id !== id);
        saveRequests(nextRequests);
        renderDashboard();
        showToast("Заявка удалена", "success");
      });
    }
  }

  function renderDashboard() {
    const loginSection = qs("#loginSection");
    const dashboardSection = qs("#dashboardSection");
    const userName = qs("#userName");
    const userPhone = qs("#userPhone");
    const requestCount = qs("#requestCount");
    const requestList = qs("#requestList");
    const emptyRequests = qs("#emptyRequests");

    if (!loginSection || !dashboardSection) return;

    const user = localStorageGet(STORAGE_KEYS.user, null);
    const requests = getRequests();

    loginSection.classList.toggle("is-hidden", Boolean(user));
    dashboardSection.classList.toggle("is-hidden", !user);

    if (!user) return;

    if (userName) userName.textContent = user.name || "Абонент";
    if (userPhone) userPhone.textContent = user.phone || "—";
    if (requestCount) requestCount.textContent = String(requests.length);

    if (!requestList || !emptyRequests) return;

    emptyRequests.classList.toggle("is-hidden", requests.length > 0);
    requestList.innerHTML = requests.map(getRequestTemplate).join("");
  }

  function getRequestTemplate(request) {
    const statusClass = request.status === "Новая" ? "status--warning" : "";

    return `
      <article class="request-item">
        <div>
          <h4>${escapeHTML(request.service)}</h4>
          <p>${escapeHTML(request.address)}</p>
          <p>${escapeHTML(request.comment)}</p>
          <div class="request-item__meta">
            <span class="status ${statusClass}">${escapeHTML(request.status)}</span>
            <span class="status">${formatDate(request.createdAt)}</span>
          </div>
        </div>
        <button class="delete-request" type="button" data-delete-id="${request.id}" aria-label="Удалить заявку">&times;</button>
      </article>
    `;
  }

  function createRequest({ service, address, comment, status }) {
    return {
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      service,
      address,
      comment,
      status,
      createdAt: new Date().toISOString()
    };
  }

  function getRequests() {
    const requests = localStorageGet(STORAGE_KEYS.requests, []);
    return Array.isArray(requests) ? requests : [];
  }

  function saveRequests(requests) {
    localStorageSet(STORAGE_KEYS.requests, requests);
  }

  function initContactForm() {
    const form = qs("#contactForm");
    if (!form) return;

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!validateForm(form)) {
        showToast("Исправьте ошибки в форме", "error");
        return;
      }

      form.reset();
      clearFormErrors(form);
      showToast("Сообщение отправлено в поддержку", "success");
    });
  }

  function validateForm(form) {
    let isValid = true;
    const fields = qsa("input, select, textarea", form).filter((field) => field.type !== "hidden");

    fields.forEach((field) => {
      const value = field.value.trim();
      let message = "";

      if (field.hasAttribute("required") && !value) {
        message = "Поле обязательно для заполнения";
      } else if (field.type === "email" && value && !isEmail(value)) {
        message = "Введите корректный email";
      } else if (field.type === "tel" && value && !isPhone(value)) {
        message = "Введите корректный номер телефона";
      } else if (field.name === "message" && value && value.length < 10) {
        message = "Сообщение должно быть не короче 10 символов";
      }

      setFieldError(field, message);
      if (message) isValid = false;
    });

    return isValid;
  }

  function clearFormErrors(form) {
    qsa(".field", form).forEach((field) => {
      field.classList.remove("has-error");
      const error = qs(".field__error", field);
      if (error) error.textContent = "";
    });
  }

  function setFieldError(input, message) {
    const field = input.closest(".field");
    if (!field) return;

    const error = qs(".field__error", field);
    field.classList.toggle("has-error", Boolean(message));
    if (error) error.textContent = message;
  }

  function isEmail(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function isPhone(value) {
    return /^[+\d\s()-]{7,}$/.test(value);
  }

  function showToast(message, type = "success") {
    const container = qs("[data-toast-container]");
    if (!container) return;

    const toast = document.createElement("div");
    toast.className = `toast toast--${type}`;
    toast.textContent = message;
    container.append(toast);

    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(8px)";
      setTimeout(() => toast.remove(), 220);
    }, 3200);
  }

  function formatDate(isoDate) {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) return "дата неизвестна";

    return new Intl.DateTimeFormat("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    }).format(date);
  }

  function escapeHTML(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function localStorageGet(key, fallback) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function localStorageSet(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      showToast("Не удалось сохранить данные в браузере", "error");
    }
  }
})();
