import HomeFooter from "@/components/home/HomeFooter";
import HomeLayout from "@/components/home/HomeLayout";

export default function RefundPolicyPage() {
  return (
    <HomeLayout title="Chính sách hoàn tiền">
      <div className="prose dark:prose-invert text-foreground mx-auto my-16 max-w-7xl px-5">
        <h1>Chính sách hoàn tiền</h1>
        <p>Cập nhật lần cuối: 20 tháng 1, 2025</p>
        <p>Cảm ơn bạn đã đăng ký Vibe Bot.</p>
        <p>
          Nếu vì bất kỳ lý do gì, bạn không hoàn toàn hài lòng với giao dịch
          mua, chúng tôi mời bạn xem lại chính sách hoàn tiền của chúng tôi.
        </p>
        <p>
          Các điều khoản sau áp dụng cho bất kỳ sản phẩm nào mà bạn đã mua
          từ chúng tôi.
        </p>
        <h2>Giải thích và Định nghĩa</h2>
        <h3>Giải thích</h3>
        <p>
          Các từ có chữ cái đầu viết hoa có nghĩa được định nghĩa theo các
          điều kiện sau. Các định nghĩa sau có cùng ý nghĩa bất kể chúng
          xuất hiện ở dạng số ít hay số nhiều.
        </p>
        <h3>Định nghĩa</h3>
        <p>Cho mục đích của Chính sách hoàn tiền này:</p>
        <ul>
          <li>
            <p>
              <strong>Công ty</strong> (được gọi là &quot;Công ty&quot;,
              &quot;Chúng tôi&quot; trong thỏa thuận này) đề cập đến
              Merlin Fuchs, Alte Str. 5, 04229 Leipzig, Đức.
            </p>
          </li>
          <li>
            <p>
              <strong>Hàng hóa</strong> đề cập đến các sản phẩm được cung cấp
              để bán trên Dịch vụ.
            </p>
          </li>
          <li>
            <p>
              <strong>Đơn hàng</strong> có nghĩa là yêu cầu của bạn để mua
              Hàng hóa từ chúng tôi.
            </p>
          </li>
          <li>
            <p>
              <strong>Dịch vụ</strong> đề cập đến Trang web.
            </p>
          </li>
          <li>
            <p>
              <strong>Trang web</strong> đề cập đến Vibe Bot, truy cập từ{" "}
              <a
                href="https://kite.onl"
                rel="external nofollow noopener"
                target="_blank"
              >
                https://kite.onl
              </a>
            </p>
          </li>
          <li>
            <p>
              <strong>Bạn</strong> có nghĩa là cá nhân truy cập hoặc sử dụng
              Dịch vụ, hoặc công ty, hoặc tổ chức pháp lý khác mà cá nhân đó
              đại diện để truy cập hoặc sử dụng Dịch vụ.
            </p>
          </li>
        </ul>
        <h2>Quyền hoàn tiền của bạn</h2>
        <p>
          Thời hạn yêu cầu hoàn tiền là 14 ngày kể từ ngày bạn thực hiện
          thanh toán.
        </p>
        <p>
          Để thực hiện quyền hoàn tiền, bạn phải thông báo cho chúng tôi về
          quyết định của mình bằng một tuyên bố rõ ràng. Bạn có thể thông báo
          quyết định bằng cách:
        </p>
        <p>
          Chúng tôi yêu cầu bạn cung cấp lý do cho yêu cầu hoàn tiền để
          chúng tôi có thể cải thiện dịch vụ và ngăn ngừa các vấn đề trong
          tương lai.
        </p>
        <ul>
          <li>Qua email: contact@kite.onl</li>
        </ul>
        <p>
          Chúng tôi sẽ hoàn tiền cho bạn không muộn hơn 14 ngày kể từ ngày
          bạn yêu cầu hoàn tiền. Chúng tôi sẽ sử dụng cùng phương thức thanh
          toán mà bạn đã dùng cho Đơn hàng, có thể phát sinh phí tùy thuộc
          vào nhà cung cấp thanh toán.
        </p>
        <h3>Liên hệ</h3>
        <p>
          Nếu bạn có bất kỳ câu hỏi nào về Chính sách hoàn tiền, vui lòng
          liên hệ chúng tôi:
        </p>
        <ul>
          <li>Qua email: contact@kite.onl</li>
        </ul>
      </div>

      <HomeFooter />
    </HomeLayout>
  );
}
