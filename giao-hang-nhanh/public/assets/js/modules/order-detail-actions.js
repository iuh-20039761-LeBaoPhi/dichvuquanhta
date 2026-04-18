(function (window) {
  if (window.GiaoHangNhanhOrderDetailActions) return;

  function createOrderDetailActions(deps) {
    const {
      normalizeMultilineText,
      normalizeDetail,
      uploadOrderMedia,
      showToast,
      buildShipperSnapshot,
      persistDetail,
      getCurrentDetail,
      setCurrentDetail,
      getCurrentViewer,
      getCurrentSession,
      rerender,
    } = deps || {};

    function bindFileSummary(input, host, emptyMessage) {
      if (!input || !host) return;

      const refresh = () => {
        const files = input.files ? Array.from(input.files) : [];
        host.textContent = files.length
          ? `Đã chọn: ${files.map((file) => file.name).join(", ")}`
          : emptyMessage;
      };

      input.addEventListener("change", refresh);
      refresh();
    }

    function setSubmitPending(form, pendingLabel, isPending) {
      const submitButton =
        form?.querySelector('button[type="submit"]') || null;
      if (!submitButton) return;

      if (!submitButton.dataset.defaultLabel) {
        submitButton.dataset.defaultLabel = submitButton.textContent || "";
      }

      submitButton.disabled = Boolean(isPending);
      submitButton.setAttribute("aria-busy", isPending ? "true" : "false");
      submitButton.textContent = isPending
        ? pendingLabel
        : submitButton.dataset.defaultLabel;
    }

    function collectFiles(...inputs) {
      return inputs.flatMap((input) =>
        input?.files ? Array.from(input.files) : [],
      );
    }

    function bindFeedbackForm(root) {
      const form = root.querySelector("#standalone-feedback-form");
      if (!form) return;

      const imageInput = form.querySelector('input[name="feedback_media_image"]');
      const videoInput = form.querySelector('input[name="feedback_media_video"]');
      const imageSummary = root.querySelector("#standalone-feedback-image-files");
      const videoSummary = root.querySelector("#standalone-feedback-video-files");
      bindFileSummary(imageInput, imageSummary, "Chưa chọn ảnh phản hồi.");
      bindFileSummary(videoInput, videoSummary, "Chưa chọn video phản hồi.");

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (form.dataset.isSubmitting === "true") return;
        form.dataset.isSubmitting = "true";
        setSubmitPending(form, "Đang lưu...", true);

        try {
          const formData = new FormData(form);
          const rating = Number(formData.get("rating") || 0);
          const feedback = normalizeMultilineText(formData.get("feedback") || "");
          const files = collectFiles(imageInput, videoInput);
          const nextDetail = normalizeDetail(getCurrentDetail());
          const orderRef =
            nextDetail.order?.order_code || nextDetail.order?.id || "";
          const existingFeedbackMedia = Array.isArray(
            nextDetail.provider?.feedback_media,
          )
            ? nextDetail.provider.feedback_media
            : [];
          const uploadedFeedbackMedia = files.length
            ? await uploadOrderMedia(orderRef, files, "feedback")
            : [];
          const nextFeedbackMedia = uploadedFeedbackMedia.length
            ? [...existingFeedbackMedia, ...uploadedFeedbackMedia]
            : existingFeedbackMedia;

          nextDetail.order.rating = rating;
          nextDetail.order.feedback = feedback;
          nextDetail.provider = {
            ...(nextDetail.provider || {}),
            feedback_media: nextFeedbackMedia,
          };

          setCurrentDetail(await persistDetail(nextDetail));
          showToast("Đã lưu phản hồi khách hàng.", "success");
          rerender(getCurrentDetail(), getCurrentViewer(), getCurrentSession());
        } catch (error) {
          console.error("Cannot save feedback:", error);
          showToast(
            error?.message || "Không thể lưu phản hồi khách hàng lúc này.",
            "error",
          );
        } finally {
          form.dataset.isSubmitting = "false";
          setSubmitPending(form, "Đang lưu...", false);
        }
      });
    }

    function bindShipperNoteForm(root) {
      const form = root.querySelector("#standalone-shipper-note-form");
      if (!form) return;

      const imageInput = form.querySelector('input[name="shipper_media_image"]');
      const videoInput = form.querySelector('input[name="shipper_media_video"]');
      const imageSummary = root.querySelector("#standalone-shipper-image-files");
      const videoSummary = root.querySelector("#standalone-shipper-video-files");
      bindFileSummary(imageInput, imageSummary, "Chưa chọn ảnh báo cáo.");
      bindFileSummary(videoInput, videoSummary, "Chưa chọn video báo cáo.");

      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (form.dataset.isSubmitting === "true") return;
        form.dataset.isSubmitting = "true";
        setSubmitPending(form, "Đang lưu...", true);

        try {
          const formData = new FormData(form);
          const shipperNote = normalizeMultilineText(
            formData.get("shipper_note") || "",
          );
          const files = collectFiles(imageInput, videoInput);
          const nextDetail = normalizeDetail(getCurrentDetail());
          const orderRef =
            nextDetail.order?.order_code || nextDetail.order?.id || "";
          const existingReports = Array.isArray(
            nextDetail.provider?.shipper_reports,
          )
            ? nextDetail.provider.shipper_reports
            : [];
          const uploadedReports = files.length
            ? await uploadOrderMedia(orderRef, files, "shipper")
            : [];

          nextDetail.order.shipper_note = shipperNote;
          nextDetail.provider = {
            ...(nextDetail.provider || {}),
            ...buildShipperSnapshot(nextDetail),
            shipper_reports: files.length
              ? [...existingReports, ...uploadedReports]
              : existingReports,
          };

          setCurrentDetail(await persistDetail(nextDetail));
          showToast("Đã lưu ghi chú nhà cung cấp.", "success");
          rerender(getCurrentDetail(), getCurrentViewer(), getCurrentSession());
        } catch (error) {
          console.error("Cannot save shipper note:", error);
          showToast(
            error?.message || "Không thể lưu ghi chú nhà cung cấp lúc này.",
            "error",
          );
        } finally {
          form.dataset.isSubmitting = "false";
          setSubmitPending(form, "Đang lưu...", false);
        }
      });
    }

    return {
      bindFeedbackForm,
      bindShipperNoteForm,
    };
  }

  window.GiaoHangNhanhOrderDetailActions = createOrderDetailActions;
})(window);
