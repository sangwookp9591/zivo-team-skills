# TDD Test Templates

각 계층별 테스트 작성 시 이 템플릿을 사용한다. 안쪽 계층(Domain)부터 바깥(Controller) 순서로 작성.

## 1. Domain Aggregate 테스트

위치: `test/.../domain/aggregate/{AggregateRoot}Test.java`

```java
package com.example.demo.{domain}.domain.aggregate;

import com.example.demo.common.exception.BusinessException;
import com.example.demo.{domain}.support.exception.{Domain}ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.*;

class {AggregateRoot}Test {

    @Nested
    @DisplayName("create")
    class Create {
        @Test
        void 생성_시_기본_상태는_활성() {
            // Arrange & Act
            {AggregateRoot} entity = {AggregateRoot}.create("테스트", 1L);

            // Assert
            assertThat(entity.isActive()).isTrue();
            assertThat(entity.isDeleted()).isFalse();
            assertThat(entity.getName()).isEqualTo("테스트");
            assertThat(entity.getCreatedBy()).isEqualTo(1L);
        }
    }

    @Nested
    @DisplayName("deactivate")
    class Deactivate {
        @Test
        void 활성_상태에서_비활성화_성공() {
            // Arrange
            {AggregateRoot} entity = {AggregateRoot}.create("테스트", 1L);

            // Act
            entity.deactivate(1L);

            // Assert
            assertThat(entity.isActive()).isFalse();
        }

        @Test
        void 이미_삭제된_상태에서_비활성화_시_예외발생() {
            // Arrange
            {AggregateRoot} entity = {AggregateRoot}.create("테스트", 1L);
            entity.softDelete(1L);

            // Act & Assert
            assertThatThrownBy(() -> entity.deactivate(1L))
                .isInstanceOf(BusinessException.class)
                .extracting("errorCode")
                .isEqualTo({Domain}ErrorCode.ALREADY_DELETED);
        }
    }

    @Nested
    @DisplayName("softDelete")
    class SoftDelete {
        @Test
        void 삭제_성공() {
            // Arrange
            {AggregateRoot} entity = {AggregateRoot}.create("테스트", 1L);

            // Act
            entity.softDelete(1L);

            // Assert
            assertThat(entity.isDeleted()).isTrue();
            assertThat(entity.isActive()).isFalse();
        }
    }
}
```

## 2. UseCase 테스트

위치: `test/.../application/usecase/{feature}/impl/{UseCase}ImplTest.java`

```java
package com.example.demo.{domain}.application.usecase.{feature}.impl;

import com.example.demo.common.exception.BusinessException;
import com.example.demo.{domain}.application.command.{Command};
import com.example.demo.{domain}.domain.aggregate.{AggregateRoot};
import com.example.demo.{domain}.domain.repository.{AggregateRoot}Repository;
import com.example.demo.{domain}.support.exception.{Domain}ErrorCode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class {UseCase}ImplTest {

    @Mock {AggregateRoot}Repository repository;
    @InjectMocks {UseCase}Impl useCase;

    @Test
    void 정상_실행_성공() {
        // Arrange
        {AggregateRoot} entity = {AggregateRoot}.create("테스트", 1L);
        {Command} command = {Command}.of(null, "테스트", 1L);
        when(repository.save(any())).thenReturn(entity);

        // Act
        var result = useCase.execute(command);

        // Assert
        assertThat(result).isNotNull();
        verify(repository).save(any());
    }

    @Test
    void 존재하지_않는_엔티티_조회_시_예외발생() {
        // Arrange
        when(repository.findActiveById(99L)).thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> useCase.execute(99L))
            .isInstanceOf(BusinessException.class)
            .extracting("errorCode")
            .isEqualTo({Domain}ErrorCode.NOT_FOUND);
    }
}
```

## 3. Controller 테스트

위치: `test/.../interfaces/api/{role}/{AggregateRoot}{Role}ControllerTest.java`

```java
package com.example.demo.{domain}.interfaces.api.{role};

import com.example.demo.{domain}.application.usecase.{feature}.{UseCase};
import com.example.demo.{domain}.interfaces.mapper.{AggregateRoot}InterfaceMapper;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.bean.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest({AggregateRoot}{Role}Controller.class)
class {AggregateRoot}{Role}ControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockBean {UseCase} useCase;
    @MockBean {AggregateRoot}InterfaceMapper mapper;

    @Test
    void 생성_요청_201() throws Exception {
        // Arrange
        var request = Map.of("name", "테스트");

        // Act & Assert
        mockMvc.perform(post("/api/{role}/{resource}")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void 이름_없이_생성_요청_시_400() throws Exception {
        // Arrange
        var request = Map.of("name", "");

        // Act & Assert
        mockMvc.perform(post("/api/{role}/{resource}")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isBadRequest());
    }
}
```

## 4. Repository Adapter 테스트 (JPA)

위치: `test/.../infrastructure/persistence/adapter/{AggregateRoot}RepositoryAdapterTest.java`

```java
package com.example.demo.{domain}.infrastructure.persistence.adapter;

import com.example.demo.{domain}.domain.aggregate.{AggregateRoot};
import com.example.demo.{domain}.infrastructure.persistence.jpa.repository.{AggregateRoot}JpaRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;

import static org.assertj.core.api.Assertions.*;

@DataJpaTest
class {AggregateRoot}RepositoryAdapterTest {

    @Autowired {AggregateRoot}JpaRepository jpaRepository;
    {AggregateRoot}RepositoryAdapter adapter;

    @BeforeEach
    void setUp() {
        adapter = new {AggregateRoot}RepositoryAdapter(jpaRepository);
    }

    @Test
    void 저장_후_조회_성공() {
        // Arrange
        {AggregateRoot} entity = {AggregateRoot}.create("테스트", 1L);

        // Act
        {AggregateRoot} saved = adapter.save(entity);
        var found = adapter.findActiveById(saved.getId());

        // Assert
        assertThat(found).isPresent();
        assertThat(found.get().getName()).isEqualTo("테스트");
    }

    @Test
    void 삭제된_엔티티는_조회되지_않음() {
        // Arrange
        {AggregateRoot} entity = {AggregateRoot}.create("테스트", 1L);
        {AggregateRoot} saved = adapter.save(entity);
        saved.softDelete(1L);
        adapter.save(saved);

        // Act
        var found = adapter.findActiveById(saved.getId());

        // Assert
        assertThat(found).isEmpty();
    }
}
```
