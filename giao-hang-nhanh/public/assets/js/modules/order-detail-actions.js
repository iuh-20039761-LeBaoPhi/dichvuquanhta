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
          ? `Da chon: ${files.map((file) => file.name).join(", ")}`
          : emptyMessage;
      };

      input.addEventListener("change", refresh);
      refresh();
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
      bindFileSummary(imageInput, imageSummary, "Chua chon anh phan hoi.");
      bindFileSummary(videoInput, videoSummary, "Chua chon video phan hoi.");

      form.addEventListener("submit", async (event) => {
        event.preventDefault();

        try {
          const formData = new FormData(form);
          const rating = Number(formData.get("rating") || 0);
          const feedback = normalizeMultilineText(formData.get("feedback") || "");
          const files = collectFiles(imageInput, videoInput);
          const nextDetail = normalizeDetail(getCurrentDetail());
          const orderRef =
            nextDetail.order?.order_code || nextDetail.order?.id || "";
          const nextFeedbackMedia = files.length
            ? await uploadOrderMedia(orderRef, files, "feedback")
            : Array.isArray(nextDetail.provider?.feedback_media)
              ? nextDetail.provider.feedback_media
              : [];

          nextDetail.order.rating = rating;
          nextDetail.order.feedback = feedback;
          nextDetail.provider = {
            ...(nextDetail.provider || {}),
            feedback_media: nextFeedbackMedia,
          };

          setCurrentDetail(await persistDetail(nextDetail));
          showToast("Da luu phan hoi khach hang.", "success");
          rerender(getCurrentDetail(), getCurrentViewer(), getCurrentSession());
        } catch (error) {
          console.error("Cannot save feedback:", error);
          showToast(
            error?.message || "Khong the luu phan hoi khach hang luc nay.",
            "error",
          );
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
      bindFileSummary(imageInput, imageSummary, "Chua chon anh bao cao.");
      bindFileSummary(videoInput, videoSummary, "Chua chon video bao cao.");

      form.addEventListener("submit", async (event) => {
        event.preventDefault();

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
          showToast("Da luu ghi chu nha cung cap.", "success");
          rerender(getCurrentDetail(), getCurrentViewer(), getCurrentSession());
        } catch (error) {
          console.error("Cannot save shipper note:", error);
          showToast(
            error?.message || "Khong the luu ghi chu nha cung cap luc nay.",
            "error",
          );
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
